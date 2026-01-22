-- Create table for lifter applications to tasks
CREATE TABLE public.task_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    lifter_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(task_id, lifter_id)
);

-- Enable RLS
ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;

-- Lifters can create applications for available tasks
CREATE POLICY "Lifters can apply to tasks"
ON public.task_applications
FOR INSERT
WITH CHECK (auth.uid() = lifter_id);

-- Lifters can view their own applications
CREATE POLICY "Lifters can view their applications"
ON public.task_applications
FOR SELECT
USING (auth.uid() = lifter_id);

-- Clients can view applications for their tasks
CREATE POLICY "Clients can view applications for their tasks"
ON public.task_applications
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tasks 
        WHERE tasks.id = task_applications.task_id 
        AND tasks.client_id = auth.uid()
    )
);

-- Clients can update applications for their tasks (accept/reject)
CREATE POLICY "Clients can update applications for their tasks"
ON public.task_applications
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.tasks 
        WHERE tasks.id = task_applications.task_id 
        AND tasks.client_id = auth.uid()
    )
);

-- Lifters can delete their own pending applications
CREATE POLICY "Lifters can delete their pending applications"
ON public.task_applications
FOR DELETE
USING (auth.uid() = lifter_id AND status = 'pending');

-- Create trigger for updated_at
CREATE TRIGGER update_task_applications_updated_at
    BEFORE UPDATE ON public.task_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for task_applications
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_applications;