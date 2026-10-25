ALTER TABLE public.app_ads ADD COLUMN expires_at timestamptz;
COMMENT ON COLUMN public.app_ads.expires_at IS 'Optional end time: the ad stops showing automatically after this moment';