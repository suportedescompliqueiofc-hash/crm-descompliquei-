import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  nome: string;
  telefone: string;
  email?: string;
  procedimento_interesse?: string;
  origem?: string;
  valid: boolean;
  errors: string[];
}

const normalizePhone = (raw: string): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  return digits;
};

const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ['nome', 'telefone', 'email', 'procedimento_interesse', 'origem'],
    ['João Silva', '11987654321', 'joao@email.com', 'Botox', 'organico'],
    ['Maria Santos', '21912345678', '', 'Rinoplastia', 'marketing'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, 'modelo_importacao_leads.xlsx');
};

const parseRows = (raw: Record<string, unknown>[]): ParsedRow[] => {
  return raw.map((row) => {
    const findCol = (...keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(row).find(c => c.toLowerCase().trim() === k);
        if (found !== undefined) return String(row[found] ?? '').trim();
      }
      return '';
    };

    const nome = findCol('nome', 'name', 'cliente');
    const telefone = normalizePhone(findCol('telefone', 'phone', 'celular', 'whatsapp', 'fone'));
    const email = findCol('email', 'e-mail');
    const procedimento_interesse = findCol('procedimento_interesse', 'procedimento', 'interesse', 'servico', 'serviço');
    const origem = findCol('origem', 'source', 'canal') || 'organico';

    const errors: string[] = [];
    if (!nome) errors.push('Nome obrigatório');
    if (!telefone || telefone.length < 10) errors.push('Telefone inválido');

    return { nome, telefone, email, procedimento_interesse, origem, valid: errors.length === 0, errors };
  });
};

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function ImportLeadsDialog({ open, onOpenChange }: ImportLeadsDialogProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  const reset = () => {
    setStep('upload');
    setRows([]);
    setImportedCount(0);
    setErrorCount(0);
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        if (raw.length === 0) { toast.error('Planilha vazia ou sem dados reconhecíveis.'); return; }
        setRows(parseRows(raw));
        setStep('preview');
      } catch {
        toast.error('Erro ao ler o arquivo. Verifique o formato.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!user || !orgId || validRows.length === 0) return;
    setStep('importing');

    const BATCH = 50;
    let ok = 0;
    let fail = 0;

    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH).map(r => ({
        usuario_id: user.id,
        organization_id: orgId,
        nome: r.nome,
        telefone: r.telefone,
        email: r.email || null,
        procedimento_interesse: r.procedimento_interesse || null,
        origem: r.origem || 'organico',
        status: 'ativo',
        posicao_pipeline: 1,
        queixa_principal: '',
      }));

      const { error } = await supabase.from('leads').insert(batch);
      if (error) {
        fail += batch.length;
      } else {
        ok += batch.length;
      }
    }

    setImportedCount(ok);
    setErrorCount(fail);
    setStep('done');
    queryClient.invalidateQueries({ queryKey: ['leads', orgId] });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Leads por Planilha
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Faça upload de um arquivo <strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong>.
              As colunas <strong>nome</strong> e <strong>telefone</strong> são obrigatórias.
            </p>

            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40"
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">.xlsx, .xls, .csv — máx. 5.000 linhas</p>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
            </div>

            <Button variant="outline" size="sm" className="self-start gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Baixar modelo de planilha
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary">{rows.length} linhas lidas</Badge>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{validRows.length} válidas</Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive">{invalidRows.length} com erro</Badge>
              )}
            </div>

            <div className="overflow-auto rounded-lg border border-border flex-1 max-h-80">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Nome</th>
                    <th className="text-left p-2 font-medium">Telefone</th>
                    <th className="text-left p-2 font-medium">Email</th>
                    <th className="text-left p-2 font-medium">Procedimento</th>
                    <th className="text-left p-2 font-medium">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={cn("border-t border-border", !row.valid && "bg-red-50")}>
                      <td className="p-2">
                        {row.valid
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          : <span title={row.errors.join(', ')}><AlertCircle className="h-3.5 w-3.5 text-destructive" /></span>
                        }
                      </td>
                      <td className="p-2">{row.nome || <span className="text-destructive italic">vazio</span>}</td>
                      <td className="p-2">{row.telefone || <span className="text-destructive italic">inválido</span>}</td>
                      <td className="p-2 text-muted-foreground">{row.email}</td>
                      <td className="p-2 text-muted-foreground">{row.procedimento_interesse}</td>
                      <td className="p-2 text-muted-foreground">{row.origem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Linhas com erro serão ignoradas. Apenas as {validRows.length} linhas válidas serão importadas.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>
                Importar {validRows.length} lead{validRows.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando leads, aguarde...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="text-lg font-semibold">{importedCount} lead{importedCount !== 1 ? 's' : ''} importado{importedCount !== 1 ? 's' : ''}!</p>
              {errorCount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">{errorCount} não puderam ser inseridos (telefone duplicado ou erro).</p>
              )}
            </div>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
