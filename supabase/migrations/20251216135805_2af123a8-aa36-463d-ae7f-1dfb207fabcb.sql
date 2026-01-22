-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  lifter_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  published_price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_attesa' CHECK (status IN ('in_attesa', 'accettato', 'in_arrivo', 'completato', 'cancellato')),
  is_sos BOOLEAN NOT NULL DEFAULT false,
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Clients can view their own tasks
CREATE POLICY "Clients can view their own tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() = client_id);

-- Lifters can view tasks they accepted
CREATE POLICY "Lifters can view accepted tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() = lifter_id);

-- Anyone authenticated can view available tasks (in_attesa)
CREATE POLICY "Users can view available tasks" 
ON public.tasks 
FOR SELECT 
USING (status = 'in_attesa' AND auth.uid() IS NOT NULL);

-- Clients can create their own tasks
CREATE POLICY "Clients can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() = client_id);

-- Clients can update their own tasks
CREATE POLICY "Clients can update their own tasks" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = client_id);

-- Lifters can update tasks they accepted (status changes)
CREATE POLICY "Lifters can update accepted tasks" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = lifter_id);

-- Clients can delete their own tasks
CREATE POLICY "Clients can delete their own tasks" 
ON public.tasks 
FOR DELETE 
USING (auth.uid() = client_id);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  is_kyc_verified BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  skills TEXT[],
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;