-- 1. Identificar e mesclar todos os criativos duplicados pela url_midia
DO $$ 
DECLARE 
    r RECORD;
    kept_criativo_id UUID;
BEGIN
    FOR r IN 
        SELECT organization_id, url_midia, array_agg(id ORDER BY criado_em ASC) as criativo_ids
        FROM public.criativos
        WHERE url_midia IS NOT NULL AND url_midia <> ''
        GROUP BY organization_id, url_midia
        HAVING count(id) > 1
    LOOP
        -- Mantém o criativo mais antigo (primeiro a ser registrado)
        kept_criativo_id := r.criativo_ids[1]; 
        
        -- Atualiza os leads que apontavam para as cópias para apontarem para o criativo principal
        UPDATE public.leads 
        SET criativo_id = kept_criativo_id 
        WHERE criativo_id = ANY(r.criativo_ids[2:array_length(r.criativo_ids, 1)]);
        
        -- Exclui definitivamente as cópias do criativo
        DELETE FROM public.criativos 
        WHERE id = ANY(r.criativo_ids[2:array_length(r.criativo_ids, 1)]);
    END LOOP;
END $$;

-- 2. Criar a trava de segurança (UNIQUE INDEX)
-- Remove o index caso já exista para recriar de forma segura
DROP INDEX IF EXISTS criativos_organization_id_url_midia_idx;

-- Cria o index único ignorando valores nulos ou vazios 
-- (isso é importante para permitir que você crie criativos manuais sem mídia sem gerar conflito)
CREATE UNIQUE INDEX criativos_organization_id_url_midia_idx 
ON public.criativos (organization_id, url_midia) 
WHERE url_midia IS NOT NULL AND url_midia <> '';