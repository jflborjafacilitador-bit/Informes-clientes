CREATE OR REPLACE FUNCTION public.get_instance_name(p_instance_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name text;
BEGIN
    SELECT instance_name INTO v_name
    FROM whatsapp_instances
    WHERE id = p_instance_id;
    RETURN v_name;
END;
$$;
