-- Fix do advisor de segurança (Function Search Path Mutable) nas 2 funções de
-- trigger criadas em 20260730130000: cs_contexto_set_atualizado_em e
-- cs_bloquear_alteracao não tinham `SET search_path` fixo. CREATE OR REPLACE
-- só adiciona a cláusula — comportamento idêntico, mesmas assinaturas.

CREATE OR REPLACE FUNCTION public.cs_contexto_set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cs_bloquear_alteracao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Esta tabela só recebe entradas novas (INSERT) — nunca é sobrescrita nem resumida (P3/P2). Para corrigir uma entrada anterior, registre uma entrada nova.';
END;
$function$;
