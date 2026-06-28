'use client';

import { useState, useRef } from 'react';
import { Camera, MapPin, CheckCircle, Loader2, ShieldAlert, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './ReportForm.module.css';

export default function ReportForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Validation Warning Modal state
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Reset progress
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          setError('Unable to retrieve your location. Please check permissions.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  // Perform Cloudinary upload with real-time progress events
  const uploadToCloudinary = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      setUploadStatus('Preparing upload...');
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Let's first try our signed server-side upload
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 90); // cap at 90% until server responds
          setUploadProgress(percentComplete);
          setUploadStatus(`Uploading to Cloudinary... ${percentComplete}%`);
        }
      });

      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            const resData = JSON.parse(xhr.responseText);
            setUploadProgress(100);
            setUploadStatus('Upload complete!');
            resolve(resData.secure_url);
          } catch (e) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          // If server upload fails (e.g. missing API secret), fallback to client-side unsigned upload
          setUploadStatus('Using direct fallback upload...');
          
          const fallbackXhr = new XMLHttpRequest();
          // Public unsigned upload endpoint
          fallbackXhr.open('POST', 'https://api.cloudinary.com/v1_1/doa9zlrqk/image/upload', true);
          
          const fallbackFormData = new FormData();
          fallbackFormData.append('file', file);
          fallbackFormData.append('upload_preset', 'ml_default');

          fallbackXhr.upload.addEventListener('progress', (ev) => {
            if (ev.lengthComputable) {
              const percentComplete = Math.round((ev.loaded / ev.total) * 90);
              setUploadProgress(percentComplete);
              setUploadStatus(`Direct uploading... ${percentComplete}%`);
            }
          });

          fallbackXhr.onload = () => {
            if (fallbackXhr.status >= 200 && fallbackXhr.status < 300) {
              try {
                const fbData = JSON.parse(fallbackXhr.responseText);
                setUploadProgress(100);
                setUploadStatus('Upload complete (fallback)!');
                resolve(fbData.secure_url);
              } catch (err) {
                reject(new Error('Failed to parse fallback response'));
              }
            } else {
              reject(new Error(`Cloudinary upload failed: status ${fallbackXhr.status}`));
            }
          };

          fallbackXhr.onerror = () => reject(new Error('Network error during fallback upload'));
          fallbackXhr.send(fallbackFormData);
        }
      };

      xhr.onerror = () => {
        // Fallback to client-side unsigned if server is completely down
        setUploadStatus('Server down, running direct fallback...');
        const fallbackFormData = new FormData();
        fallbackFormData.append('file', file);
        fallbackFormData.append('upload_preset', 'ml_default');

        const fallbackXhr = new XMLHttpRequest();
        fallbackXhr.open('POST', 'https://api.cloudinary.com/v1_1/doa9zlrqk/image/upload', true);
        
        fallbackXhr.onload = () => {
          if (fallbackXhr.status >= 200 && fallbackXhr.status < 300) {
            const fbData = JSON.parse(fallbackXhr.responseText);
            resolve(fbData.secure_url);
          } else {
            reject(new Error('Direct fallback failed.'));
          }
        };
        fallbackXhr.send(fallbackFormData);
      };

      xhr.send(formData);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !location) {
      setError('Please provide title, description, and location.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setValidationError(null);

    try {
      let imageUrl = null;
      let aiData = null;

      // 1. Upload image to Cloudinary (if file selected)
      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      // 2. Perform Gemini Vision and Indian Municipal Routing validation
      setUploadStatus('Analyzing with Gemini Vision...');
      const verifyRes = await fetch('/api/verify-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          description: description
        })
      });

      if (!verifyRes.ok) {
        throw new Error('Gemini Vision analysis failed. Check connection.');
      }

      aiData = await verifyRes.json();

      // 3. Strict Pre-Posting Validation: Check if it's a real civic issue
      if (aiData && aiData.isValidCivicIssue === false) {
        // Flagged as invalid! Intercept posting and open warning dialog
        setValidationError(aiData.invalidityReason || 'This photo does not appear to contain a valid civic infrastructure or public hazard issue.');
        setIsLoading(false);
        return;
      }

      // 4. Get logged-in user profile info
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate SLA and priority score
      const severity = aiData?.severity || 'Medium';
      const safetyRisk = aiData?.safety_risk || 'medium';
      const confidence = aiData?.confidence || 0.75;
      
      let slaHours = 72; // default medium
      if (severity.toLowerCase() === 'high') {
        slaHours = 24;
      } else if (severity.toLowerCase() === 'low') {
        slaHours = 168;
      }

      const createdDate = new Date();
      const slaDueDate = new Date(createdDate.getTime() + slaHours * 60 * 60 * 1000);

      // Priority score calculation: Severity + Safety Risk + Confidence
      let severityPoints = 25;
      if (severity.toLowerCase() === 'high') severityPoints = 50;
      else if (severity.toLowerCase() === 'low') severityPoints = 10;

      let riskPoints = 15;
      if (safetyRisk.toLowerCase() === 'high') riskPoints = 30;
      else if (safetyRisk.toLowerCase() === 'low') riskPoints = 5;
      else if (safetyRisk.toLowerCase() === 'none') riskPoints = 0;

      const confidencePoints = Math.round(confidence * 10);
      const initialPriorityScore = Math.min(100, severityPoints + riskPoints + confidencePoints);

      // 5. Insert into Supabase DB
      const { data, error: dbError } = await supabase
        .from('issues')
        .insert([{
          title,
          description,
          lat: location.lat,
          lng: location.lng,
          image_url: imageUrl,
          category: aiData?.category || 'Other',
          severity: severity,
          status: 'pending',
          detected_label: aiData?.complaint_draft || null,
          official_summary: aiData?.official_summary || null,
          confidence: confidence,
          safety_risk: safetyRisk,
          department: aiData?.department || 'General Administration',
          estimated_cost: aiData?.estimated_cost || null,
          reporter_name: user?.user_metadata?.name || 'Anonymous Citizen',
          reporter_email: user?.email || null,
          sla_hours: slaHours,
          sla_due_at: slaDueDate.toISOString(),
          priority_score: initialPriorityScore
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // 6. Log the event
      if (data) {
        await supabase.from('issue_events').insert([{
          issue_id: data.id,
          type: 'created',
          message: 'Issue reported and validated by AI routing agent.'
        }]);
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
          <CheckCircle className={styles.successIcon} size={64} />
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 700 }}>Report Logged Successfully</h2>
          <p style={{ marginTop: '1rem', color: 'hsl(var(--foreground))', opacity: 0.8, lineHeight: 1.6 }}>
            Thank you for being a Community Hero. Your issue has been logged, routed to the responsible SLA department, and is now live on the city map.
          </p>
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
      {/* 1. Validation Warning Modal */}
      {validationError && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <ShieldAlert size={56} style={{ color: 'hsl(var(--destructive))', marginBottom: '1.5rem', display: 'inline' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit', marginBottom: '1rem' }}>AI Validation Alert</h3>
            <p style={{ color: 'hsl(var(--foreground))', opacity: 0.85, fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              {validationError}
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={() => {
                setValidationError(null);
                setImageFile(null);
                setImagePreview(null);
              }}
            >
              Upload Different Image
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Form */}
      <div className={styles.formContainer}>
        <h2 className={styles.title} style={{ fontFamily: 'Outfit', fontWeight: 800 }}>File a Civic Complaint</h2>
        
        <form onSubmit={handleSubmit}>
          
          {/* Photo Input with real-time Laser scanning animation */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Upload Proof (Photo/Video)</label>
            <input 
              type="file" 
              accept="image/*,video/*" 
              className={styles.fileInput}
              ref={fileInputRef}
              onChange={handleImageChange}
              disabled={isLoading}
            />
            {!imagePreview ? (
              <div 
                className={styles.fileUploadArea}
                onClick={() => !isLoading && fileInputRef.current?.click()}
              >
                <Camera className={styles.fileUploadIcon} size={36} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tap to take a photo or select media</p>
                <p style={{ fontSize: '0.75rem', color: '#737373', marginTop: '0.25rem' }}>Cloudinary integration active</p>
              </div>
            ) : (
              <div>
                <div className={styles.previewContainer}>
                  <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                  
                  {/* AI Laser Scanner Overlay during validation */}
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
                    onClick={() => {setImageFile(null); setImagePreview(null);}}
                  >
                    Remove Image
                  </button>
                )}
              </div>
            )}
            
            {/* Real-time upload progress */}
            {isLoading && imageFile && uploadProgress > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#737373', fontWeight: 500 }}>
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
            <label className={styles.label}>Complaint Title</label>
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
            <label className={styles.label}>Detailed Description</label>
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
              <div className={styles.locationText}>
                <MapPin size={16} />
                Location secured: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
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
