import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { randomInt } from 'crypto';

admin.initializeApp();

const SMTP_HOST = defineSecret('SMTP_HOST');
const SMTP_PORT = defineSecret('SMTP_PORT');
const SMTP_USUARIO = defineSecret('SMTP_USUARIO');
const SMTP_SENHA = defineSecret('SMTP_SENHA');
const EMAIL_REMETENTE = defineSecret('EMAIL_REMETENTE');

function generateStrongPassword(length = 14): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[!@#$%&*]/];

  let candidate = '';
  do {
    candidate = '';
    for (let i = 0; i < length; i++) {
      candidate += charset[randomInt(0, charset.length)];
    }
  } while (!classes.every((re) => re.test(candidate)));

  return candidate;
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (c) => map[c]);
}

function buildResetPasswordEmailHtml(name: string, tempPassword: string): string {
  return `
  <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:680px;max-width:100%;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td style="background-color:#164194;padding:36px 36px 28px;text-align:center;">
        <div style="font-size:11px;font-weight:400;color:#A8C950;letter-spacing:3px;text-transform:uppercase;">
          Sistema de Gestão de Licenças
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px auto;">
          <tr><td width="50" height="3" style="background-color:#A8C950;font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:36px;font-size:14px;font-weight:400;line-height:1.8;color:#312D31;">
        <p style="margin:0 0 18px;">Olá, ${escapeHtml(name)}.</p>
        <p style="margin:0 0 18px;">
          Uma nova senha temporária foi gerada para o seu acesso:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
          <tr>
            <td style="background-color:#F7F7F7;border-left:4px solid #A8C950;padding:16px 20px;font-size:18px;font-weight:700;color:#164194;letter-spacing:1px;">
              ${escapeHtml(tempPassword)}
            </td>
          </tr>
        </table>
        <p style="margin:0 0 18px;">
          No próximo login, você precisará definir uma nova senha antes de acessar o sistema.
        </p>
        <p style="margin:0;">Se você não solicitou essa alteração, entre em contato com o administrador do sistema.</p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#164194;padding:28px 36px;text-align:center;color:#D7E1F5;font-size:12px;">
        <strong>Ambiental</strong> &bull; CNPJ 03.094.629/0001-36 &bull; Joinville/SC
        <br /><span style="color:#B9C9E6;">Favor não responder a este e-mail.</span>
      </td>
    </tr>
  </table>`;
}

interface ResetPasswordRequest {
  targetUserId: string;
}

export const adminResetUserPassword = onCall<ResetPasswordRequest>(
  {
    region: 'us-central1',
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USUARIO, SMTP_SENHA, EMAIL_REMETENTE],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Você precisa estar autenticado.');
    }

    const targetUserId = request.data?.targetUserId;
    if (!targetUserId || typeof targetUserId !== 'string') {
      throw new HttpsError('invalid-argument', 'targetUserId é obrigatório.');
    }

    const db = admin.firestore();

    const callerSnap = await db
      .collection('users')
      .where('uid', '==', request.auth.uid)
      .limit(1)
      .get();

    if (callerSnap.empty) {
      throw new HttpsError('permission-denied', 'Perfil do solicitante não encontrado.');
    }

    const callerData = callerSnap.docs[0].data();
    if (callerData.role !== 'admin' || callerData.active !== true) {
      throw new HttpsError(
        'permission-denied',
        'Apenas administradores ativos podem gerar senha para outro usuário.'
      );
    }

    const targetRef = db.collection('users').doc(targetUserId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
      throw new HttpsError('not-found', 'Usuário não encontrado.');
    }

    const targetData = targetSnap.data()!;
    const targetUid: string | undefined = targetData.uid;
    const targetEmail: string | undefined = targetData.email;
    const targetName: string = targetData.name || targetEmail || 'usuário';

    if (!targetUid || !targetEmail) {
      throw new HttpsError(
        'failed-precondition',
        'Usuário-alvo não possui uid ou e-mail válidos no Firestore.'
      );
    }

    const newPassword = generateStrongPassword();

    try {
      await admin.auth().updateUser(targetUid, { password: newPassword });
    } catch (err) {
      console.error('adminResetUserPassword: falha ao atualizar Auth', err);
      throw new HttpsError('internal', 'Não foi possível atualizar a senha no Firebase Auth.');
    }

    await targetRef.update({ mustChangePassword: true });

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST.value(),
        port: Number(SMTP_PORT.value()),
        secure: false,
        auth: {
          user: SMTP_USUARIO.value(),
          pass: SMTP_SENHA.value(),
        },
      });

      await transporter.sendMail({
        from: EMAIL_REMETENTE.value(),
        to: targetEmail,
        subject: 'Nova senha temporária — Sistema de Gestão de Licenças',
        text:
          `Olá, ${targetName}.\n\n` +
          `Uma nova senha temporária foi gerada para sua conta: ${newPassword}\n\n` +
          `No próximo login você precisará definir uma nova senha antes de acessar o sistema.\n\n` +
          `Se você não solicitou isso, contate o administrador do sistema.`,
        html: buildResetPasswordEmailHtml(targetName, newPassword),
      });
    } catch (err) {
      console.error('adminResetUserPassword: falha ao enviar e-mail', err);
      throw new HttpsError(
        'internal',
        'A senha foi alterada, mas o e-mail não pôde ser enviado. Tente gerar novamente ou contate o suporte.'
      );
    }

    return { success: true, email: targetEmail };
  }
);
