import nodemailer from 'nodemailer';
import pino from 'pino';

const logger = pino();

interface EmailConfig {
  enabled: boolean;
  adminEmail: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

class EmailService {
  private config: EmailConfig;
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.config = {
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
      adminEmail: process.env.ADMIN_EMAIL || '',
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || ''
    };

    if (this.config.enabled && this.config.smtpUser && this.config.smtpPass) {
      this.initializeTransporter();
    }
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpPort === 465,
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPass
        }
      });

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled && this.transporter !== null && this.config.adminEmail !== '';
  }

  public toggleNotifications(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info(`Email notifications ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled && !this.transporter && this.config.smtpUser && this.config.smtpPass) {
      this.initializeTransporter();
    }
  }

  public async sendGameStartNotification(gameData: {
    roomName: string;
    playerCount: number;
    players: string[];
    isPrivate: boolean;
    timestamp: Date;
  }): Promise<void> {
    if (!this.isEnabled()) {
      logger.debug('Email notifications disabled, skipping notification');
      return;
    }

    try {
      const subject = `🎯 Nouvelle partie MortPion lancée - ${gameData.roomName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎯 Nouvelle partie MortPion</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Détails de la partie</h3>
            
            <p><strong>Nom de la salle :</strong> ${gameData.roomName}</p>
            <p><strong>Type :</strong> ${gameData.isPrivate ? '🔒 Privée' : '🌐 Publique'}</p>
            <p><strong>Nombre de joueurs :</strong> ${gameData.playerCount}</p>
            <p><strong>Heure de début :</strong> ${gameData.timestamp.toLocaleString('fr-FR')}</p>
            
            <h4 style="color: #1e293b;">Joueurs :</h4>
            <ul style="margin: 10px 0;">
              ${gameData.players.map(player => `<li>${player}</li>`).join('')}
            </ul>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            Cette notification a été envoyée automatiquement par le système MortPion.
          </p>
        </div>
      `;

      const text = `
🎯 Nouvelle partie MortPion lancée

Salle: ${gameData.roomName}
Type: ${gameData.isPrivate ? 'Privée' : 'Publique'}
Joueurs: ${gameData.playerCount}
Heure: ${gameData.timestamp.toLocaleString('fr-FR')}

Participants: ${gameData.players.join(', ')}
      `;

      await this.transporter!.sendMail({
        from: this.config.smtpUser,
        to: this.config.adminEmail,
        subject,
        text,
        html
      });

      logger.info(`Game notification email sent for room: ${gameData.roomName}`);
    } catch (error) {
      logger.error('Failed to send game notification email:', error);
    }
  }

  public getStatus() {
    return {
      enabled: this.config.enabled,
      configured: this.transporter !== null,
      adminEmail: this.config.adminEmail ? `${this.config.adminEmail.substring(0, 3)}***` : 'Not set'
    };
  }
}

export const emailService = new EmailService();
