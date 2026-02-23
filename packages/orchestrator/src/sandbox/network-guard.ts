const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'api.openai.com', 'api.anthropic.com'];

export class NetworkGuard {
  private allowedHosts: Set<string>;

  constructor(allowedHosts: string[] = DEFAULT_ALLOWED_HOSTS) {
    this.allowedHosts = new Set(allowedHosts.map((h) => h.toLowerCase()));
  }

  validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return this.allowedHosts.has(host);
    } catch {
      return false;
    }
  }

  addAllowedHost(host: string): void {
    this.allowedHosts.add(host.toLowerCase());
  }

  removeAllowedHost(host: string): void {
    this.allowedHosts.delete(host.toLowerCase());
  }

  getAllowedHosts(): string[] {
    return Array.from(this.allowedHosts);
  }
}
