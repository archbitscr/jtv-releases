import dns from 'dns';
import net from 'net';

const originalLookup = dns.lookup;
let isEnabled = false;

async function queryDoh(hostname) {
  const url = `https://1.1.1.2/dns-query?name=${encodeURIComponent(hostname)}&type=A`;
  const res = await fetch(url, {
    headers: { 'accept': 'application/dns-json' },
    signal: AbortSignal.timeout(4000)
  });
  if (!res.ok) throw new Error(`DoH query failed with status: ${res.status}`);
  const data = await res.json();
  if (data.Status !== 0 || !data.Answer || data.Answer.length === 0) {
    throw new Error(`No DNS records found in DoH answer for ${hostname}`);
  }
  const aRecord = data.Answer.find(ans => ans.type === 1);
  if (!aRecord) throw new Error(`No A record found in DoH answer for ${hostname}`);
  return aRecord.data;
}

export function initCloudflareNetworkService(context) {
  isEnabled = !!context.state.cloudflareProtectionEnabled;
  console.log(`[CloudflareNetworkService] Initialized. Status: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

  dns.lookup = function(hostname, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (!isEnabled) {
      return originalLookup(hostname, options, callback);
    }

    // Bypass DoH for direct IPs, localhost, DNS resolver, and local domains
    if (
      net.isIP(hostname) ||
      hostname === '1.1.1.2' ||
      hostname === 'security.cloudflare-dns.com' ||
      hostname === 'localhost' ||
      hostname.endsWith('.local')
    ) {
      return originalLookup(hostname, options, callback);
    }

    queryDoh(hostname)
      .then(ip => {
        if (options.all) {
          callback(null, [{ address: ip, family: 4 }]);
        } else {
          callback(null, ip, 4);
        }
      })
      .catch(err => {
        console.warn(`[CloudflareNetworkService] DoH failed for ${hostname}: ${err.message}. Falling back to default system DNS.`);
        originalLookup(hostname, options, callback);
      });
  };
}

export function enableCloudflareProtection() {
  isEnabled = true;
  console.log('[CloudflareNetworkService] Secure Cloudflare DoH filter ENABLED.');
}

export function disableCloudflareProtection() {
  isEnabled = false;
  console.log('[CloudflareNetworkService] Secure Cloudflare DoH filter DISABLED.');
}
