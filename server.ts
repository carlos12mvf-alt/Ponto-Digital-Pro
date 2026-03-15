import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to send invitation email
  app.post("/api/send-invitation", async (req, res) => {
    const { email, companyName, adminName } = req.body;

    console.log(`Tentativa de envio de convite para: ${email}`);

    if (!process.env.RESEND_API_KEY) {
      console.error("ERRO: RESEND_API_KEY não encontrada no ambiente.");
      return res.status(500).json({ 
        error: "Configuração de e-mail ausente no servidor. Verifique as variáveis de ambiente." 
      });
    }

    const resendClient = new Resend(process.env.RESEND_API_KEY);

    const host = req.get('origin') || req.get('referer') || process.env.APP_URL || 'http://localhost:3000';
    // Auto-convert dev URL to shared URL to avoid 403 errors for employees
    let publicHost = host;
    if (host.includes('ais-dev-')) {
      publicHost = host.replace('ais-dev-', 'ais-pre-');
    }
    const inviteLink = publicHost.endsWith('/') ? `${publicHost}register` : `${publicHost}/register`;

    try {
      const { data, error } = await resendClient.emails.send({
        from: 'Ponto Digital Pro <onboarding@resend.dev>',
        to: [email],
        subject: `Convite para se juntar à ${companyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5;">Olá!</h2>
            <p style="font-size: 16px; color: #475569;">
              <strong>${adminName}</strong> convidou você para fazer parte da equipe da <strong>${companyName}</strong> no Ponto Digital Pro.
            </p>
            <p style="font-size: 16px; color: #475569;">
              Para começar a registrar seu ponto, basta criar sua conta usando este e-mail através do link abaixo:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Criar Minha Conta
              </a>
            </div>
            <p style="font-size: 14px; color: #94a3b8;">
              Se você não esperava este convite, pode ignorar este e-mail.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Erro retornado pelo Resend:", error);
        return res.status(500).json({ error: `Erro do serviço de e-mail: ${error.message}` });
      }

      console.log("E-mail enviado com sucesso via Resend:", data);
      res.json({ success: true, data });
    } catch (err) {
      console.error("Erro no servidor de e-mail:", err);
      res.status(500).json({ error: "Erro interno ao processar convite." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
