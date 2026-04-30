# Deployment Script for IA Functions (ia-proxy + chat-completion)

Write-Host "Iniciando deploy das funções de IA..." -ForegroundColor Cyan

# Deploy ia-proxy
Write-Host "`n[1/2] Fazendo deploy da ia-proxy..." -ForegroundColor Yellow
npx supabase functions deploy ia-proxy --project-ref noncbgdczgcboronmcah --no-verify-jwt

# Deploy chat-completion
Write-Host "`n[2/2] Fazendo deploy da chat-completion..." -ForegroundColor Yellow
npx supabase functions deploy chat-completion --project-ref noncbgdczgcboronmcah --no-verify-jwt

Write-Host "`nDeploy concluído!" -ForegroundColor Green
Write-Host "`nSecrets necessários (configure se ainda não tiver):" -ForegroundColor Cyan
Write-Host "  npx supabase secrets set XAI_API_KEY=... --project-ref noncbgdczgcboronmcah"
Write-Host "  npx supabase secrets set OPENROUTER_API_KEY=... --project-ref noncbgdczgcboronmcah"
Write-Host "  npx supabase secrets set OPENAI_API_KEY=... --project-ref noncbgdczgcboronmcah"
