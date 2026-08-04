export type TemplateFormat = "email" | "markdown" | "plain";

export interface TemplateOptions {
  contributorName?: string;
  waveNumber?: number;
  deadline?: Date;
  minXlmBalance?: number;
  supportEmail?: string;
  assetCode?: string;
  assetIssuer?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateEmailTemplate(options: TemplateOptions): string {
  const {
    contributorName = "Contributor",
    waveNumber = 1,
    deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    minXlmBalance = 1,
    supportEmail = "support@trustbridge.dev",
    assetCode = "USDC",
    assetIssuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6",
  } = options;

  return `Subject: Wave ${waveNumber} Payout Readiness Check

Dear ${contributorName},

Thank you for being part of the TrustBridge Wave ${waveNumber}!

To ensure you receive your payout successfully, please complete the following checklist by ${formatDate(deadline)}:

**Step 1: Fund Your Stellar Account**
- Ensure your Stellar G-address has at least ${minXlmBalance} XLM for transaction fees and reserves
- You can purchase XLM from any Stellar-supported exchange

**Step 2: Set Up ${assetCode} Trustline**
- Log into your Stellar wallet (Lobstr, Stellar.Expert, or similar)
- Add a trustline for ${assetCode} from issuer: ${assetIssuer}
- Mark the trustline as authorized if your wallet prompts you

**Step 3: Verify via TrustBridge Dashboard**
- Visit: https://trustbridge.dev/dashboard
- Sign in with your GitHub account
- Check that your status shows "Ready" (✅)

**Wallet Proof (if requested)**
- Screenshot your Stellar account showing:
  - Your public address (G-address)
  - XLM balance ≥ ${minXlmBalance}
  - Active ${assetCode} trustline with authorization status

**Need Help?**
If you encounter any issues, please:
1. Check the TrustBridge docs: https://docs.trustbridge.dev
2. Review common issues: https://docs.trustbridge.dev/troubleshooting
3. Contact support: ${supportEmail}

We look forward to Wave ${waveNumber}!

Best regards,
The TrustBridge Team`;
}

export function generateMarkdownTemplate(options: TemplateOptions): string {
  const {
    contributorName = "Contributor",
    waveNumber = 1,
    deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    minXlmBalance = 1,
    supportEmail = "support@trustbridge.dev",
    assetCode = "USDC",
    assetIssuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6",
  } = options;

  return `# Wave ${waveNumber} Payout Readiness

Hi ${contributorName}! 👋

Thank you for being part of Wave ${waveNumber}. To receive your payout, complete this checklist by **${formatDate(deadline)}**:

## ✅ Checklist

### 1. Fund Your Stellar Account
- [ ] Stellar account has ≥ ${minXlmBalance} XLM
- [ ] XLM covers transaction fees and reserves

### 2. Set Up ${assetCode} Trustline
- [ ] Added trustline for ${assetCode}
- [ ] Issuer: \`${assetIssuer}\`
- [ ] Trustline is authorized

### 3. Verify on TrustBridge
- [ ] Open https://trustbridge.dev/dashboard
- [ ] Dashboard shows status: **Ready** ✅
- [ ] Last checked: Today or recent

## 📸 Wallet Proof

If requested, provide a screenshot showing:
- Your Stellar public address
- XLM balance ≥ ${minXlmBalance}
- ${assetCode} trustline (authorized)

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Low XLM balance | Purchase XLM from an exchange |
| Can't add trustline | Check wallet supports ${assetCode} |
| Trustline unauthorized | Contact issuer to authorize |

**Questions?** → ${supportEmail}`;
}

export function generatePlainTemplate(options: TemplateOptions): string {
  const {
    contributorName = "Contributor",
    waveNumber = 1,
    deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    minXlmBalance = 1,
    supportEmail = "support@trustbridge.dev",
    assetCode = "USDC",
    assetIssuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6",
  } = options;

  return `WAVE ${waveNumber} PAYOUT READINESS CHECKLIST
${"=".repeat(50)}

Hello ${contributorName},

To receive your Wave ${waveNumber} payout by ${formatDate(deadline)}, complete:

STEP 1: Fund Your Stellar Account
- Ensure at least ${minXlmBalance} XLM in your account
- This covers transaction fees and minimum reserve

STEP 2: Add ${assetCode} Trustline
- Open your Stellar wallet
- Add trustline for ${assetCode}
- Issuer: ${assetIssuer}
- Set trustline authorization to: Authorized

STEP 3: Verify via TrustBridge Dashboard
- Visit: https://trustbridge.dev/dashboard
- Sign in with GitHub
- Confirm status shows: Ready (✅)

WALLET PROOF (if required)
- Screenshot your Stellar account showing:
  - Your public address (starts with G)
  - XLM balance of at least ${minXlmBalance}
  - Active ${assetCode} trustline

NEED HELP?
- Documentation: https://docs.trustbridge.dev
- Common issues: https://docs.trustbridge.dev/troubleshooting
- Email support: ${supportEmail}

Ready for Wave ${waveNumber}!
The TrustBridge Team`;
}

export function generateTemplate(
  format: TemplateFormat,
  options: TemplateOptions
): string {
  switch (format) {
    case "email":
      return generateEmailTemplate(options);
    case "markdown":
      return generateMarkdownTemplate(options);
    case "plain":
      return generatePlainTemplate(options);
    default:
      throw new Error(`Unknown template format: ${format}`);
  }
}
