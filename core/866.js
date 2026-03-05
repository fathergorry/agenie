import iconv from 'iconv-lite';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

export function sysInfo() {
    const platform = process.platform;
    
    if (platform === 'win32') {
        const shell = process.env.PROMPT ? 'cmd' : 
                     process.env.PSModulePath ? 'PowerShell' : 
                     'cmd';
        return [platform, shell];
    }
    
    const shell = process.env.SHELL?.split('/').pop() || 'sh';
    return [platform, shell];
}

function detectEncodingFromBuffer(buffer) {
    const utf8String = buffer.toString('utf8');
    const hasValidCyrillic = /[\u0400-\u04FF]/.test(utf8String);
    
    if (hasValidCyrillic) {
        const cleanText = utf8String.replace(/[^\w\s\u0400-\u04FF\u4E00-\u9FFF]/g, '');
        const readability = cleanText.length / utf8String.length;
        
        if (readability > 0.5) {
            return 'utf8';
        }
    }
    
    const cp866String = iconv.decode(buffer, 'cp866');
    const hasReadableCyrillic = /[\u0400-\u04FF]/.test(cp866String);
    
    if (hasReadableCyrillic) {
        return 'cp866';
    }
    
    return 'utf8';
}

export function decode(buffer) {
    if (typeof buffer === 'string') return buffer;
    
    if (!Buffer.isBuffer(buffer)) return String(buffer);
    
    const detectedEncoding = detectEncodingFromBuffer(buffer);
    
    if (detectedEncoding === 'utf8') {
        return buffer.toString('utf8');
    }
    
    return iconv.decode(buffer, detectedEncoding);
}

// Тест через spawn
function testSpawn(cmd) {
    return new Promise((resolve) => {
        const child = spawn(cmd, { shell: true, env: process.env });
        
        let outputBuffer = Buffer.alloc(0);
        child.stdout.on('data', (data) => {
          outputBuffer = Buffer.concat([outputBuffer, data]);
        });
        child.stderr.on('data', (data) => {
          outputBuffer = Buffer.concat([outputBuffer, data]);
        });

        child.on('close', (code) => {
          const decodedOutput = decode(outputBuffer);
          if (decodedOutput.trim()) {
            console.log(decodedOutput.trim());
            resolve(decodedOutput.trim());
          } else {
            const msg = `Command finished with code ${code}`;
            console.log(msg);
            resolve(msg);
          }
        });
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    console.log('sysInfo ', sysInfo());
    
    if (process.platform === 'win32') {
        testSpawn('cmd /c "route print"')
            .then(() => testSpawn('dir /w'))
            .catch(error => console.error('Test failed:', error.message));
    }
}