# cha-de-panela-daniel-sophia
Site de confirmação de presença do Chá de Panela de Daniel &amp; Sophia — 28/11/2026


## Lista de presentes

Depois de confirmar presença, o convidado vê a mensagem de compra e a lista de presentes (Bigazine e Havan).
Clicar em um item abre a loja e registra a escolha; o painel dos noivos mostra o presente de cada grupo.

- **Itens:** `src/lib/gifts.ts` (Bigazine já preenchida; para a Havan, preencha `HAVAN_GIFTS`).
- **Fotos:** coloque `public/presentes/<codigo>.jpg` (ex.: `112568.jpg`). Sem arquivo, aparece uma imagem padrão.
- **Banco:** após atualizar o código, rode `npm run db:push` (adiciona 4 colunas opcionais; não apaga dados).
- **Excluir convidado:** botão 🗑 no painel (pede confirmação; a exclusão é definitiva).
