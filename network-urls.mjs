import os from 'node:os';

export function getLocalIPv4Addresses() {
  const addresses = new Set();

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces ?? []) {
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (isIPv4 && !net.internal) {
        addresses.add(net.address);
      }
    }
  }

  return [...addresses];
}

export function printNetworkAccess({ apiPort = 3001, webPort = 5173 } = {}) {
  const ips = getLocalIPv4Addresses();

  console.log('\n📱 Acceso para meseros (misma red WiFi):');

  if (ips.length === 0) {
    console.log('   No se detectó IP de red local. Revisa tu conexión WiFi.');
    return ips;
  }

  for (const ip of ips) {
    console.log(`   App:  http://${ip}:${webPort}/login`);
    console.log(`   (API incluida en el mismo puerto ${webPort})`);
    console.log('');
  }

  console.log('   Comparte la URL de App con los meseros.');
  return ips;
}
