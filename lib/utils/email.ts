export function extractEmail(emailString: string): string {
  // Extract email from format "Name <email@domain.com>" or just "email@domain.com"
  const match = emailString.match(/<(.+?)>/) || [null, emailString];
  return match[1].toLowerCase();
} 