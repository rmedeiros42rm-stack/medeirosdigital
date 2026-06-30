# medeirosdigital

Projeto atualizado com captação Google Maps, WhatsApp, importação/edição de e-mails e campanhas.

## Atualização aplicada

- WhatsApp principal atualizado para 87996327349 / 5587996327349.
- Painel administrativo simplificado com: Dashboard básico, Captação Google Maps, Empresas captadas, Campanhas por e-mail e Configurações.
- Módulos Financeiro, Propostas, Follow-up, IA, Demonstrações e informações duplicadas foram ocultados do menu/admin.
- Captação Google Maps mantida com empresas sem site, Abrir WhatsApp, Abrir Maps, e-mail editável, importação CSV/TXT e salvamento no Supabase.
- Campanhas por e-mail agora aceitam importação CSV/TXT ou colagem manual de lista e enviam em massa via netlify/functions/send-campaign.js.
- search-businesses.js mantido com Google Places e limite ajustado para até 50 resultados.

### Variáveis necessárias no Netlify

- GOOGLE_MAPS_API_KEY
- RESEND_API_KEY
- RESEND_FROM_EMAIL, opcional
