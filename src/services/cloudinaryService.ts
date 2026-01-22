import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  url: string;
  publicId: string;
}

export const uploadToCloudinary = async (
  file: File | Blob,
  folder: string = 'liftome',
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<UploadResult> => {
  // Convert file to base64
  const base64 = await fileToBase64(file);
  
  const { data, error } = await supabase.functions.invoke('cloudinary-upload', {
    body: {
      file: base64,
      folder,
      resourceType,
    },
  });

  if (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Riprova – connessione lenta');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return {
    url: data.url,
    publicId: data.publicId,
  };
};

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const uploadProfilePhoto = async (file: File): Promise<string> => {
  const result = await uploadToCloudinary(file, 'liftome/profiles', 'image');
  return result.url;
};

export const uploadTaskPhoto = async (file: File): Promise<string> => {
  const result = await uploadToCloudinary(file, 'liftome/tasks', 'image');
  return result.url;
};

export const uploadAudioMessage = async (blob: Blob): Promise<string> => {
  const result = await uploadToCloudinary(blob, 'liftome/audio', 'video');
  return result.url;
};
