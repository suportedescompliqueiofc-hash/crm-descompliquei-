import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { Criativo, MetaMetrics } from "@/hooks/useMarketing";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MetaImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criativos: Criativo[];
  onImport: (mapping: { id: string; metrics: MetaMetrics }[]) => void;
}

interface CSVRow {
  campaignName: string;
  metrics: MetaMetrics;
}

export function MetaImportModal({ open, onOpenChange, criativos, onImport }: MetaImportModalProps) {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [matchedData, setMatchedData] = useState<{ row: CSVRow; creativeId: string | null }[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const parseNumber = (value: string) => {
    if (!value) return 0;
    // Remove aspas se houver
    const cleanValue = value.replace(/"/g, '');
    // Se for formato brasileiro (1.000,00), converte para (1000.00)
    // Mas o CSV do Meta geralmente vem com ponto decimal se for exportado em EN ou vírgula em PT
    // O exemplo mostra: 27.42 (ponto) e 1.148135 (ponto). Parece formato internacional ou misto.
    // Vamos assumir ponto como decimal baseado no exemplo.
    const floatVal = parseFloat(cleanValue);
    return isNaN(floatVal) ? 0 : floatVal;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Split lines handling different line endings
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        toast.error("Arquivo CSV inválido ou vazio.");
        return;
      }

      // Parse headers
      // Regex para splitar por vírgula mas ignorar vírgulas dentro de aspas
      const splitCSV = (str: string) => {
        const matches = str.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        // Fallback simples se o regex falhar ou para linhas simples
        if (!matches) return str.split(',');
        return matches.map(m => m.replace(/^"|"$/g, '')); // Remove surrounding quotes
      };

      // Mapeamento de índices baseado no cabeçalho
      const headers = splitCSV(lines[0]).map(h => h.trim().replace(/"/g, ''));
      
      const idxName = headers.indexOf('Nome da campanha');
      const idxResults = headers.indexOf('Resultados');
      const idxReach = headers.indexOf('Alcance');
      const idxSpend = headers.indexOf('Valor usado (BRL)');
      const idxCostPerResult = headers.indexOf('Custo por resultados');
      const idxImpressions = headers.indexOf('Impressões');
      const idxClicks = headers.indexOf('Cliques no link');
      const idxCPC = headers.indexOf('CPC (custo por clique no link) (BRL)');
      const idxCTR = headers.indexOf('CTR (taxa de cliques no link)');

      if (idxName === -1) {
        toast.error("Coluna 'Nome da campanha' não encontrada no CSV.");
        return;
      }

      const parsedRows: CSVRow[] = lines.slice(1).map(line => {
        // Regex mais robusto para CSV parsing (trata vírgulas dentro de aspas)
        const values = [];
        let inQuote = false;
        let currentVal = '';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            values.push(currentVal.trim());
            currentVal = '';
          } else {
            currentVal += char;
          }
        }
        values.push(currentVal.trim()); // Push last value

        // Se a linha estiver vazia ou mal formatada, ignora
        if (values.length < headers.length * 0.5) return null; 

        return {
          campaignName: values[idxName]?.replace(/"/g, '') || 'Sem Nome',
          metrics: {
            results: parseNumber(values[idxResults]),
            reach: parseNumber(values[idxReach]),
            spend: parseNumber(values[idxSpend]),
            cost_per_result: parseNumber(values[idxCostPerResult]),
            impressions: parseNumber(values[idxImpressions]),
            clicks: parseNumber(values[idxClicks]),
            cpc: parseNumber(values[idxCPC]),
            ctr: parseNumber(values[idxCTR]),
            updated_at: new Date().toISOString()
          }
        };
      }).filter(Boolean) as CSVRow[];

      setCsvData(parsedRows);

      // Auto-match logic
      const matches = parsedRows.map(row => {
        // Tenta encontrar correspondência exata ou parcial
        const creative = criativos.find(c => 
          (c.nome && row.campaignName.toLowerCase().includes(c.nome.toLowerCase())) ||
          (c.titulo && row.campaignName.toLowerCase().includes(c.titulo.toLowerCase())) ||
          (c.nome && c.nome.toLowerCase() === row.campaignName.toLowerCase())
        );
        return { row, creativeId: creative ? creative.id : null };
      });

      setMatchedData(matches);
    };

    reader.readAsText(file);
    
    // Limpa o valor do input para permitir selecionar o mesmo arquivo novamente se necessário
    e.target.value = '';
  };

  const handleConfirm = () => {
    const importData = matchedData
      .filter(m => m.creativeId !== null)
      .map(m => ({ id: m.creativeId!, metrics: m.row.metrics }));
    
    if (importData.length === 0) {
      toast.warning("Nenhum criativo foi associado para importação.");
      return;
    }

    onImport(importData);
    onOpenChange(false);
    setCsvData([]);
    setMatchedData([]);
    setFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar Métricas do Meta Ads
          </DialogTitle>
          <DialogDescription>
            Faça upload do CSV exportado do Gerenciador de Anúncios. O sistema tentará associar as campanhas aos seus criativos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!csvData.length ? (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer relative">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">Clique para selecionar o arquivo CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Formatos suportados: .csv</p>
              {/* Usando input nativo para garantir que o w-full h-full funcione corretamente com inset-0 */}
              <input 
                type="file" 
                accept=".csv" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" 
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha (CSV)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criativo Associado (Sistema)</TableHead>
                    <TableHead className="text-right">Valor Usado</TableHead>
                    <TableHead className="text-right">Resultados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedData.map((match, idx) => (
                    <TableRow key={idx} className={!match.creativeId ? "opacity-50" : ""}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={match.row.campaignName}>
                        {match.row.campaignName}
                      </TableCell>
                      <TableCell>
                        {match.creativeId ? (
                          <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle className="h-3 w-3" /> Encontrado
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                            <AlertCircle className="h-3 w-3" /> Não associado
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {match.creativeId ? (
                          <span className="text-sm">{criativos.find(c => c.id === match.creativeId)?.nome}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem correspondência automática</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        R$ {match.row.metrics.spend.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {match.row.metrics.results}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="text-xs text-muted-foreground self-center">
            {csvData.length > 0 && `${matchedData.filter(m => m.creativeId).length} de ${csvData.length} campanhas associadas.`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={!csvData.length}>
              Confirmar Importação
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}