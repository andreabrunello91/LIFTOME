import React, { useRef, useState } from 'react';
import { Camera, Image, Trash2, Loader2, User } from 'lucide-react';
import { uploadProfilePhoto } from '@/services/cloudinaryService';
import { toast } from 'sonner';

interface ProfilePhotoUploadProps {
  currentPhoto?: string;
  isVerified?: boolean;
  onPhotoChange: (url: string | null) => void;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhoto,
  isVerified = false,
  onPhotoChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setShowOptions(false);

    try {
      const url = await uploadProfilePhoto(file);
      onPhotoChange(url);
      toast.success('Foto caricata con successo!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Riprova – connessione lenta');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(null);
    setShowOptions(false);
    toast.success('Foto rimossa');
  };

  const borderColor = isVerified ? 'border-primary' : 'border-muted-foreground/30';

  return (
    <div className="relative">
      {/* Photo Circle */}
      <div
        className={`w-[200px] h-[200px] rounded-full border-4 ${borderColor} overflow-hidden cursor-pointer bg-muted flex items-center justify-center`}
        onClick={() => !isUploading && setShowOptions(!showOptions)}
      >
        {isUploading ? (
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        ) : currentPhoto ? (
          <img
            src={currentPhoto}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-20 h-20 text-muted-foreground" />
        )}
      </div>

      {/* Options Menu */}
      {showOptions && !isUploading && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          <button
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted text-left"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-5 h-5 text-primary" />
            <span>Scatta foto</span>
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted text-left"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="w-5 h-5 text-primary" />
            <span>Scegli dalla galleria</span>
          </button>
          {currentPhoto && (
            <button
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted text-left text-destructive"
              onClick={handleRemovePhoto}
            >
              <Trash2 className="w-5 h-5" />
              <span>Rimuovi foto</span>
            </button>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Click outside to close */}
      {showOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
};

export default ProfilePhotoUpload;
