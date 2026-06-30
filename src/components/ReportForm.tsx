'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, CheckCircle, Loader2, ShieldAlert, AlertCircle, Mic } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './ReportForm.module.css';

// SHA-256 of a file's bytes — used to detect the exact same photo being re-submitted.
async function computeSha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ReportForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Media states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Multilingual & Speech states
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isRecording, setIsRecording] = useState<'title' | 'description' | null>(null);

  // Validation Warning Modal state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDuplicateLinked, setIsDuplicateLinked] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Listen for background offline synchronization
    const handleOnline = async () => {
      const queue = JSON.parse(localStorage.getItem('community_hero_offline_queue') || '[]');
      if (queue.length > 0) {
        for (const item of queue) {
          try {
            const verifyRes = await fetch('/api/verify-issue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description: item.description, language: item.language })
            });
            if (verifyRes.ok) {
              const aiData = await verifyRes.json();
              const { data: { user } } = await supabase.auth.getUser();
              
              await supabase.from('issues').insert([{
                title: item.title,
                description: item.description,
                lat: item.lat,
                lng: item.lng,
                category: aiData?.category || 'Other',
                severity: aiData?.severity || 'Medium',
                status: 'pending',
                detected_label: aiData?.complaint_draft || null,
                official_summary: aiData?.official_summary || null,
                confidence: aiData?.confidence || 0.85,
                safety_risk: aiData?.safety_risk || 'medium',
                department: aiData?.department || 'General Administration',
                reporter_name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Anonymous Citizen',
                reporter_email: user?.email || null,
                language: item.language
              }]);
            }
          } catch (e) {
            console.error('Failed to sync offline item:', e);
          }
        }
        localStorage.removeItem('community_hero_offline_queue');
        alert("Connectivity restored! Your offline reports have been synchronized with the city server.");
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(null);
      setImagePreview(null);
      setVideoFile(null);
      setVideoPreview(null);
      setUploadProgress(0);
      setUploadStatus('');

      if (file.type.startsWith('video/')) {
        setMediaType('video');
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
      } else {
        setMediaType('image');
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const getLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocationLabel(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setAccuracy(position.coords.accuracy ? Math.round(position.coords.accuracy) : null);
        // Reverse geocode to the most specific area name available
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          );
          if (res.ok) {
            const data = await res.json();
            const a = data?.address || {};
            const parts = [
              a.road || a.pedestrian || a.footway || a.neighbourhood,
              a.suburb || a.neighbourhood || a.city_district || a.village || a.hamlet,
              a.city || a.town || a.municipality || a.county,
            ].filter(Boolean);
            const unique = Array.from(new Set(parts));
            setLocationLabel(unique.length ? unique.join(', ') : (data?.display_name || null));
          }
        } catch {
          /* fall back silently to raw coordinates */
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Please enable location access in your browser settings.'
            : 'Unable to retrieve your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Web Speech API Voice Dictation
  const startVoiceDictation = (field: 'title' | 'description') => {
    if (typeof window === 'undefined') return;
    if (isRecording) return; // already listening — avoid InvalidStateError
    // Web Speech API needs a secure context (https or localhost).
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setError('Voice input needs a secure connection. Open the app on http://localhost or over HTTPS.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Please use Chrome or Edge — or type your report.');
      return;
    }
    setError(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    
    const langLocales: any = {
      en: 'en-US',
      hi: 'hi-IN',
      kn: 'kn-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      bn: 'bn-IN'
    };
    
    recognition.lang = langLocales[selectedLanguage] || 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(field);
    };

    recognition.onerror = (e: any) => {
      setIsRecording(null);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone access was denied. Allow microphone permission in your browser (address-bar icon) and try again.');
      } else if (e.error === 'no-speech') {
        setError('No speech detected. Please speak clearly after pressing the mic.');
      } else if (e.error === 'audio-capture') {
        setError('No microphone detected. Please connect a mic and allow access.');
      } else if (e.error === 'network') {
        setError('Voice service unreachable. Voice input needs Chrome or Edge with an internet connection.');
      } else if (e.error === 'language-not-supported') {
        setError('Voice input is not available for the selected language. Try English or type instead.');
      } else if (e.error !== 'aborted') {
        setError('Voice input failed. Please use Chrome/Edge with a mic, or type your report.');
      }
    };

    recognition.onend = () => {
      setIsRecording(null);
    };

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      if (field === 'title') {
        setTitle(prev => (prev + ' ' + resultText).trim());
      } else {
        setDescription(prev => (prev + ' ' + resultText).trim());
      }
    };

    recognition.start();
  };

  // Perform Cloudinary upload
  const uploadToCloudinary = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      setUploadStatus('Preparing upload...');
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 90);
          setUploadProgress(percentComplete);
          setUploadStatus(`Uploading to Cloudinary... ${percentComplete}%`);
        }
      });

      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            const resData = JSON.parse(xhr.responseText);
            setUploadProgress(100);
            resolve(resData.secure_url);
          } catch (e) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          // Unsigned fallback
          const fallbackXhr = new XMLHttpRequest();
          fallbackXhr.open('POST', 'https://api.cloudinary.com/v1_1/doa9zlrqk/image/upload', true);
          
          const fallbackFormData = new FormData();
          fallbackFormData.append('file', file);
          fallbackFormData.append('upload_preset', 'ml_default');

          fallbackXhr.upload.addEventListener('progress', (ev) => {
            if (ev.lengthComputable) {
              const percentComplete = Math.round((ev.loaded / ev.total) * 90);
              setUploadProgress(percentComplete);
            }
          });

          fallbackXhr.onload = () => {
            if (fallbackXhr.status >= 200 && fallbackXhr.status < 300) {
              const fbData = JSON.parse(fallbackXhr.responseText);
              resolve(fbData.secure_url);
            } else {
              reject(new Error('Direct fallback upload failed.'));
            }
          };
          fallbackXhr.send(fallbackFormData);
        }
      };

      xhr.onerror = () => reject(new Error('Upload error.'));
      xhr.send(formData);
    });
  };

  // Upload to Supabase Storage
  const uploadToSupabaseStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('issue-images')
      .upload(filePath, file);

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from('issue-images')
      .getPublicUrl(filePath);
    
    return publicUrl;
  };

  // Capture video frame
  const captureVideoFrame = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        video.currentTime = 1;
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          resolve(dataUrl);
        } else {
          resolve('');
        }
      };
      video.onerror = () => resolve('');
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Posting requires an account (viewing is public). Skip the check while
    // offline so queued reports still work.
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to submit a report. Redirecting to login…');
        setTimeout(() => router.push('/login?error=Please sign in to report an issue'), 1000);
        return;
      }
    }

    if (!title || !description || !location) {
      setError('Please provide title, description, and location.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setValidationError(null);

    try {
      // 0. Offline Check & Fallback
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const queue = JSON.parse(localStorage.getItem('community_hero_offline_queue') || '[]');
        queue.push({
          title,
          description,
          lat: location.lat,
          lng: location.lng,
          language: selectedLanguage,
          queuedAt: new Date().toISOString()
        });
        localStorage.setItem('community_hero_offline_queue', JSON.stringify(queue));
        setIsOfflineQueued(true);
        setIsSuccess(true);
        setIsLoading(false);
        return;
      }

      // Exact-duplicate image guard — the same photo cannot be reported twice.
      let imageHash: string | null = null;
      if (mediaType === 'image' && imageFile) {
        try {
          imageHash = await computeSha256(imageFile);
          const { data: dup } = await supabase
            .from('issues')
            .select('id, title')
            .eq('image_sha256', imageHash)
            .limit(1)
            .maybeSingle();
          if (dup) {
            setError(`This exact photo has already been reported${dup.title ? ` ("${dup.title}")` : ''}. Please take a fresh photo of the actual issue.`);
            setIsLoading(false);
            return;
          }
        } catch {
          /* hashing is best-effort; continue if it fails */
        }
      }

      let imageUrl = null;
      let videoUrl = null;
      let aiData = null;
      let extractedFrameBase64 = imagePreview;

      // Video frame capture
      if (mediaType === 'video' && videoFile) {
        setUploadStatus('Analyzing video frame...');
        extractedFrameBase64 = await captureVideoFrame(videoFile);
      }

      // Media upload
      if (mediaType === 'image' && imageFile) {
        try {
          imageUrl = await uploadToCloudinary(imageFile);
        } catch (cloudinaryErr) {
          imageUrl = await uploadToSupabaseStorage(imageFile);
        }
      } else if (mediaType === 'video' && videoFile) {
        setUploadStatus('Uploading video to storage...');
        try {
          videoUrl = await uploadToCloudinary(videoFile);
        } catch (cloudinaryErr) {
          videoUrl = await uploadToSupabaseStorage(videoFile);
        }
        if (extractedFrameBase64) {
          setUploadStatus('Generating card thumbnail...');
          const res = await fetch(extractedFrameBase64);
          const blob = await res.blob();
          const frameFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
          imageUrl = await uploadToSupabaseStorage(frameFile);
        }
      }

      // Gemini Vision validation with Multilingual language support
      setUploadStatus('Analyzing report validity with Gemini AI...');
      const verifyRes = await fetch('/api/verify-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: extractedFrameBase64,
          description: description,
          language: selectedLanguage
        })
      });

      if (!verifyRes.ok) {
        throw new Error('Gemini analysis failed. Check connection.');
      }

      aiData = await verifyRes.json();

      // Pre-Posting Validation
      if (aiData && aiData.isValidCivicIssue === false) {
        setValidationError(aiData.invalidityReason || 'This photo does not appear to contain a valid civic infrastructure or public hazard issue.');
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // SLA and Priority scoring — now uses AI-generated priority_score
      const severity = aiData?.severity || 'Medium';
      const safetyRisk = aiData?.safety_risk || 'medium';
      const confidence = aiData?.confidence || 0.75;
      
      let slaHours = 72;
      if (severity.toLowerCase() === 'high') slaHours = 24;
      else if (severity.toLowerCase() === 'low') slaHours = 168;

      const createdDate = new Date();
      const slaDueDate = new Date(createdDate.getTime() + slaHours * 60 * 60 * 1000);

      // Use AI-generated priority_score if available, otherwise fall back to formula
      let initialPriorityScore = aiData?.priority_score;
      if (typeof initialPriorityScore !== 'number' || initialPriorityScore < 0 || initialPriorityScore > 100) {
        let severityPoints = 25;
        if (severity.toLowerCase() === 'high') severityPoints = 50;
        else if (severity.toLowerCase() === 'low') severityPoints = 10;

        let riskPoints = 15;
        if (safetyRisk.toLowerCase() === 'high') riskPoints = 30;
        else if (safetyRisk.toLowerCase() === 'low') riskPoints = 5;
        else if (safetyRisk.toLowerCase() === 'none') riskPoints = 0;

        const confidencePoints = Math.round(confidence * 10);
        initialPriorityScore = Math.min(100, severityPoints + riskPoints + confidencePoints);
      }

      // Use AI numeric cost or parse the text cost
      const numericCost = aiData?.estimated_cost_numeric || null;

      // Check if duplicate detected
      if (aiData?.duplicate_of) {
        // Fetch current original issue details
        const { data: original } = await supabase
          .from('issues')
          .select('duplicate_count, upvotes, priority_score')
          .eq('id', aiData.duplicate_of)
          .single();

        const newDupCount = (original?.duplicate_count || 0) + 1;
        const newUpvotes = (original?.upvotes || 0) + 1;
        const newPriorityScore = Math.min(100, (original?.priority_score || 0) + 8);

        // Update the original issue
        await supabase
          .from('issues')
          .update({ 
            duplicate_count: newDupCount,
            upvotes: newUpvotes,
            priority_score: newPriorityScore
          })
          .eq('id', aiData.duplicate_of);

        // Log duplicate event on the original issue
        await supabase.from('issue_events').insert([{
          issue_id: aiData.duplicate_of,
          type: 'duplicate_linked',
          message: `Duplicate report linked. Total merged counts: ${newDupCount}. Priority level elevated to ${newPriorityScore}/100.`
        }]);

        setIsDuplicateLinked(true);
        setIsSuccess(true);
        setIsLoading(false);
        return;
      }

      // Insert issue
      const { data, error: dbError } = await supabase
        .from('issues')
        .insert([{
          title,
          description: description + (aiData?.location_landmark ? `\n\n📍 Landmark/Area Context: ${aiData.location_landmark}` : ''),
          lat: location.lat,
          lng: location.lng,
          image_url: imageUrl,
          image_sha256: imageHash,
          video_url: videoUrl,
          category: aiData?.category || 'Other',
          severity: severity,
          status: 'pending',
          detected_label: aiData?.complaint_draft || null,
          official_summary: aiData?.official_summary || null,
          confidence: confidence,
          safety_risk: safetyRisk,
          department: aiData?.department || 'General Administration',
          estimated_cost: numericCost ? String(numericCost) : (aiData?.estimated_cost || null),
          reporter_name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Anonymous Citizen',
          reporter_email: user?.email || null,
          sla_hours: slaHours,
          sla_due_at: slaDueDate.toISOString(),
          priority_score: initialPriorityScore,
          language: selectedLanguage
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // Log event
      if (data) {
        await supabase.from('issue_events').insert([{
          issue_id: data.id,
          type: 'created',
          message: 'Issue reported and validated by AI routing agent.'
        }]);
      }

      // 🏆 Gamification: award civic Hero Points to the reporter (existing users.hero_score)
      if (user?.email) {
        try {
          const { data: profile } = await supabase
            .from('users').select('hero_score, badges').eq('email', user.email).single();
          const earned = 50 + (safetyRisk === 'high' ? 30 : 0);
          const newScore = (profile?.hero_score || 0) + earned;
          const badges = new Set<string>(profile?.badges || []);
          badges.add('First Responder');
          if (newScore >= 500) badges.add('Ward Leader');
          await supabase.from('users').upsert(
            {
              email: user.email,
              name: user.user_metadata?.name || user.email.split('@')[0],
              hero_score: newScore,
              badges: Array.from(badges),
            },
            { onConflict: 'email' }
          );
          setEarnedPoints(earned);
        } catch {
          /* point award is non-fatal */
        }
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while submitting your report.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.successMessage}>
          <CheckCircle className={styles.successIcon} size={64} style={{ color: isDuplicateLinked ? 'var(--primary)' : 'var(--accent)' }} />
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            {isDuplicateLinked ? 'Duplicate Report Merged' : isOfflineQueued ? 'Report Queued Offline' : 'Report Logged Successfully'}
          </h2>
          <p style={{ marginTop: '1rem', color: 'var(--foreground)', opacity: 0.8, lineHeight: 1.6 }}>
            {isDuplicateLinked
              ? 'Our AI duplicate detection system identified a matching active complaint already registered in your vicinity. To avoid duplicates and boost ticket priority, we have upvoted and merged your report into the existing case!'
              : isOfflineQueued 
                ? 'Connectivity is offline. Your report has been saved to your local device cache and will automatically submit the moment connection is restored.'
                : 'Thank you for being a Community Hero. Your issue has been logged, routed to the responsible SLA department, and is now live on the city map.'}
          </p>
          {!isDuplicateLinked && !isOfflineQueued && earnedPoints > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgb(var(--accent-rgb) / 0.12)', color: 'var(--accent)', border: '1px solid rgb(var(--accent-rgb) / 0.3)', padding: '0.5rem 1rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.9rem' }}>
              <CheckCircle size={16} /> +{earnedPoints} Hero Points earned
            </div>
          )}
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '2rem', width: '100%' }}
            onClick={() => window.location.reload()}
          >
            File Another Complaint
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {validationError && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <ShieldAlert size={56} style={{ color: 'var(--destructive)', marginBottom: '1.5rem', display: 'inline' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit', marginBottom: '1rem' }}>AI Validation Alert</h3>
            <p style={{ color: 'var(--foreground)', opacity: 0.85, fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              {validationError}
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={() => {
                setValidationError(null);
                setImageFile(null);
                setImagePreview(null);
                setVideoFile(null);
                setVideoPreview(null);
              }}
            >
              Upload Different Media
            </button>
          </div>
        </div>
      )}

      <div className={styles.formContainer}>
        <h2 className={styles.title} style={{ fontFamily: 'Outfit', fontWeight: 800 }}>File a Civic Complaint</h2>
        
        <form onSubmit={handleSubmit}>
          
          {/* Language Selector */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Select Report Language</label>
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.88rem', padding: '0.5rem' }}
              disabled={isLoading}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="bn">বাংলা (Bengali)</option>
            </select>
          </div>

          {/* Photo/Video Input */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Upload Proof (Photo or Video)</label>
            <input 
              type="file" 
              accept="image/*,video/*" 
              className={styles.fileInput}
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isLoading}
            />
            {!imagePreview && !videoPreview ? (
              <div 
                className={styles.fileUploadArea}
                onClick={() => !isLoading && fileInputRef.current?.click()}
              >
                <Camera className={styles.fileUploadIcon} size={36} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tap to capture image or select video</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Cloudinary & Supabase video analysis active</p>
              </div>
            ) : (
              <div>
                <div className={styles.previewContainer}>
                  {mediaType === 'image' && imagePreview && (
                    <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                  )}
                  {mediaType === 'video' && videoPreview && (
                    <video 
                      src={videoPreview} 
                      controls 
                      className={styles.imagePreview} 
                      style={{ maxHeight: '240px', width: '100%', background: 'black' }}
                    />
                  )}
                  
                  {isLoading && (
                    <div className={styles.scanContainer}>
                      <div className={styles.scanLine} />
                    </div>
                  )}
                </div>

                {!isLoading && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.85rem' }}
                    onClick={() => {
                      setImageFile(null); 
                      setImagePreview(null);
                      setVideoFile(null);
                      setVideoPreview(null);
                    }}
                  >
                    Remove File
                  </button>
                )}
              </div>
            )}
            
            {isLoading && (imageFile || videoFile) && uploadProgress > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>
                  <span>{uploadStatus}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Complaint Title</span>
              <button
                type="button"
                onClick={() => startVoiceDictation('title')}
                style={{
                  background: isRecording === 'title' ? 'rgb(var(--destructive-rgb) / 0.15)' : 'var(--surface-hover)',
                  border: isRecording === 'title' ? '1px solid var(--destructive)' : '1px solid var(--surface-hover)',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.72rem',
                  color: isRecording === 'title' ? 'var(--destructive)' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer'
                }}
                disabled={isLoading}
              >
                <Mic size={12} className={isRecording === 'title' ? 'pulse' : ''} />
                {isRecording === 'title' ? 'Listening...' : 'Speak'}
              </button>
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="E.g., Open sewage line on Station Road"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Detailed Description</span>
              <button
                type="button"
                onClick={() => startVoiceDictation('description')}
                style={{
                  background: isRecording === 'description' ? 'rgb(var(--destructive-rgb) / 0.15)' : 'var(--surface-hover)',
                  border: isRecording === 'description' ? '1px solid var(--destructive)' : '1px solid var(--surface-hover)',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.72rem',
                  color: isRecording === 'description' ? 'var(--destructive)' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer'
                }}
                disabled={isLoading}
              >
                <Mic size={12} className={isRecording === 'description' ? 'pulse' : ''} />
                {isRecording === 'description' ? 'Listening...' : 'Speak'}
              </button>
            </label>
            <textarea 
              className={`input-field ${styles.textarea}`}
              placeholder="Describe the problem, severity, and any details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={isLoading}
            ></textarea>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>GPS Location</label>
            {location ? (
              <div className={styles.locationText} style={{ alignItems: 'flex-start' }}>
                <CheckCircle size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span>{locationLabel || `Location secured: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                    {location.lat.toFixed(5)}, {location.lng.toFixed(5)}{accuracy != null ? ` · ±${accuracy}m` : ''}
                  </span>
                  {accuracy != null && accuracy > 500 && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--warning)' }}>
                      Approximate (Wi-Fi/IP based). For a precise pin, use a phone with GPS or re-detect outdoors.
                    </span>
                  )}
                  <button type="button" onClick={getLocation}
                    style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: '0.15rem' }}>
                    Re-detect location
                  </button>
                </div>
              </div>
            ) : locating ? (
              <div className={styles.locationBtn} style={{ cursor: 'progress', justifyContent: 'center', gap: '0.6rem' }}>
                <span className="live-dot" style={{ width: '10px', height: '10px', display: 'inline-block' }} />
                <MapPin size={18} className="pulse" />
                Pinpointing your location…
              </div>
            ) : (
              <button
                type="button"
                className={styles.locationBtn}
                onClick={getLocation}
                disabled={isLoading}
              >
                <MapPin size={18} />
                Share GPS Coordinates
              </button>
            )}
          </div>

          {error && (
            <div className={styles.error} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="pulse" size={20} /> AI Agent Routing...</>
            ) : (
              'Submit to Authorities'
            )}
          </button>
        </form>
      </div>
    </>
  );
}
