'use client';

import { useState, useRef } from 'react';
import { Camera, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './ReportForm.module.css';

export default function ReportForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !location) {
      setError('Please provide title, description, and location.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      let imageUrl = null;
      let aiData = null;

      // 1. Get AI analysis if image or description exists
      if (imagePreview || description) {
        const res = await fetch('/api/verify-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imagePreview,
            description: description
          })
        });
        
        if (res.ok) {
          aiData = await res.json();
        } else {
          console.warn('AI categorization failed, proceeding with defaults');
        }
      }

      // 2. Upload image to Supabase Storage if exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('issue-images')
          .upload(filePath, imageFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('issue-images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }

      // 3. Insert into Supabase DB
      const { data, error: dbError } = await supabase
        .from('issues')
        .insert([{
          title,
          description,
          lat: location.lat,
          lng: location.lng,
          image_url: imageUrl,
          category: aiData?.category || 'Other',
          severity: aiData?.severity || 'Medium',
          status: 'pending',
          detected_label: aiData?.official_summary || null,
          confidence: aiData?.confidence || null,
          safety_risk: aiData?.safety_risk || 'unknown',
          department: aiData?.department || null,
          estimated_cost: aiData?.estimated_cost || null
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Log the event
      if (data) {
        await supabase.from('issue_events').insert([{
          issue_id: data.id,
          type: 'created',
          message: 'Issue reported by a community member.'
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
          <h2>Report Submitted Successfully!</h2>
          <p style={{ marginTop: '1rem', color: 'hsl(var(--foreground))', opacity: 0.8 }}>
            Thank you for being a Community Hero. Your issue has been logged and authorities will be notified.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '2rem' }}
            onClick={() => window.location.reload()}
          >
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.title}>Report a Community Issue</h2>
      
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Photo of the Issue</label>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            className={styles.fileInput}
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          {!imagePreview ? (
            <div 
              className={styles.fileUploadArea}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className={styles.fileUploadIcon} size={32} />
              <p>Tap to take a photo or upload from gallery</p>
            </div>
          ) : (
            <div>
              <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '0.5rem' }}
                onClick={() => {setImageFile(null); setImagePreview(null);}}
              >
                Remove Image
              </button>
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Issue Title</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="E.g., Large pothole on Main St"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Description</label>
          <textarea 
            className={`input-field ${styles.textarea}`}
            placeholder="Provide details about the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          ></textarea>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Location</label>
          {location ? (
            <div className={styles.locationText}>
              <MapPin size={16} style={{ display: 'inline', marginRight: '4px' }}/>
              Location captured: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
          ) : (
            <button type="button" className={styles.locationBtn} onClick={getLocation}>
              <MapPin size={18} />
              Share Current Location
            </button>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button 
          type="submit" 
          className={`btn btn-primary ${styles.submitBtn}`}
          disabled={isLoading}
          style={{ marginTop: '1rem' }}
        >
          {isLoading ? (
            <><Loader2 className="pulse" size={20} /> Processing with AI...</>
          ) : (
            'Submit Report'
          )}
        </button>
      </form>
    </div>
  );
}
