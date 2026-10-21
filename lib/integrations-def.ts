// Quais integrações existem e quais campos cada uma pede. Campos "secret" ficam criptografados e nunca voltam para a tela.
export type IntegrationKey = "shopee" | "telegram" | "uazapi" | "smtp";

export type FieldDef = { name: string; label: string; secret: boolean; placeholder?: string };

export type IntegrationDef = { key: IntegrationKey; title: string; help: string; fields: FieldDef[] };

export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: "shopee",
    title: "Shopee Afiliados",
    help: "Credenciais da API aberta do programa de afiliados (App ID e chave secreta). Usada pelo robô de captação e pela leitura de comissões.",
    fields: [
      { name: "appId", label: "App ID", secret: false },
      { name: "secret", label: "Chave secreta", secret: true },
    ],
  },
  {
    key: "telegram",
    title: "Telegram",
    help: "Token do bot criado no @BotFather. O bot precisa ser administrador do canal onde vai publicar.",
    fields: [{ name: "botToken", label: "Token do bot", secret: true }],
  },
  {
    key: "uazapi",
    title: "WhatsApp (UAZAPI)",
    help: "Endereço do servidor e token da instância que envia para o canal ou grupo.",
    fields: [
      { name: "baseUrl", label: "Endereço do servidor", secret: false, placeholder: "https://seu-servidor.uazapi.com" },
      { name: "token", label: "Token da instância", secret: true },
    ],
  },
  {
    key: "smtp",
    title: "E-mail (SMTP)",
    help: "Servidor que envia o boletim e a confirmação de inscrição. Porta 465 usa conexão segura direta; 587 usa STARTTLS. O e-mail de cadastro e de recuperar senha é configurado à parte, no Supabase.",
    fields: [
      { name: "host", label: "Servidor", secret: false, placeholder: "smtp.seudominio.com.br" },
      { name: "port", label: "Porta", secret: false, placeholder: "587" },
      { name: "user", label: "Usuário", secret: false },
      { name: "password", label: "Senha", secret: true },
      { name: "from", label: "Remetente", secret: false, placeholder: "Nome do site <ofertas@seudominio.com.br>" },
    ],
  },
];

export const integrationDef = (key: string) => INTEGRATIONS.find((i) => i.key === key);