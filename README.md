# medeirosdigital

Projeto Medeiros Digital migrado para Vercel.

## Estrutura

- `index.html`: site/painel principal
- `api/search-businesses.js`: função Vercel para Google Maps/Places
- `api/send-campaign.js`: função Vercel para envio via Resend

## Variáveis de ambiente na Vercel

Cadastre em Project Settings > Environment Variables:

- `GOOGLE_MAPS_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (opcional)

Depois faça novo deploy.
