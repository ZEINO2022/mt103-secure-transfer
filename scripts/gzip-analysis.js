#!/usr/bin/env node

/**
 * Gzip Analysis Script for MT103 Transfer Form
 * Analyzes compression ratios and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class GzipAnalyzer {
  constructor() {
    this.distPath = path.join(__dirname, '../dist');
    this.templatesPath = path.join(__dirname, '../templates');
  }

  async analyze() {
    console.log('🗜️  Starting Gzip Analysis...\n');

    const files = [
      { path: 'templates/form.html', name: 'Original HTML' },
      { path: 'dist/form_optimized.html', name: 'Optimized HTML' },
      { path: 'dist/assets/styles.min.css', name: 'Minified CSS' },
      { path: 'dist/assets/script.min.js', name: 'Minified JS' },
      { path: 'templates/sw.js', name: 'Service Worker' }
    ];

    const results = [];

    for (const file of files) {
      const filePath = path.join(__dirname, '..', file.path);
      if (fs.existsSync(filePath)) {
        const result = await this.analyzeFile(filePath, file.name);
        results.push(result);
      }
    }

    this.printResults(results);
    this.generateRecommendations(results);
    await this.saveReport(results);
  }

  async analyzeFile(filePath, fileName) {
    const content = fs.readFileSync(filePath);
    const originalSize = content.length;

    // Gzip compression
    const gzipped = await this.compressGzip(content);
    const gzipSize = gzipped.length;
    const gzipRatio = ((originalSize - gzipSize) / originalSize * 100);

    // Brotli compression (estimated)
    const brotliSize = Math.round(originalSize * 0.25); // Rough estimation
    const brotliRatio = ((originalSize - brotliSize) / originalSize * 100);

    return {
      fileName,
      filePath,
      originalSize,
      gzipSize,
      gzipRatio,
      brotliSize,
      brotliRatio,
      type: this.getFileType(filePath)
    };
  }

  async compressGzip(content) {
    return new Promise((resolve, reject) => {
      zlib.gzip(content, { level: 9 }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  getFileType(filePath) {
    const ext = path.extname(filePath);
    switch (ext) {
      case '.html': return 'HTML';
      case '.css': return 'CSS';
      case '.js': return 'JavaScript';
      default: return 'Other';
    }
  }

  printResults(results) {
    console.log('📊 Compression Analysis Results:\n');
    console.log('┌─────────────────────────┬──────────┬──────────┬─────────┬──────────┬─────────┐');
    console.log('│ File                    │ Original │ Gzipped  │ Ratio   │ Brotli   │ Ratio   │');
    console.log('├─────────────────────────┼──────────┼──────────┼─────────┼──────────┼─────────┤');

    let totalOriginal = 0;
    let totalGzipped = 0;
    let totalBrotli = 0;

    results.forEach(result => {
      const name = result.fileName.padEnd(23);
      const original = this.formatBytes(result.originalSize).padStart(8);
      const gzipped = this.formatBytes(result.gzipSize).padStart(8);
      const gzipRatio = `${result.gzipRatio.toFixed(1)}%`.padStart(7);
      const brotli = this.formatBytes(result.brotliSize).padStart(8);
      const brotliRatio = `${result.brotliRatio.toFixed(1)}%`.padStart(7);

      console.log(`│ ${name} │ ${original} │ ${gzipped} │ ${gzipRatio} │ ${brotli} │ ${brotliRatio} │`);

      totalOriginal += result.originalSize;
      totalGzipped += result.gzipSize;
      totalBrotli += result.brotliSize;
    });

    console.log('├─────────────────────────┼──────────┼──────────┼─────────┼──────────┼─────────┤');
    
    const totalGzipRatio = ((totalOriginal - totalGzipped) / totalOriginal * 100);
    const totalBrotliRatio = ((totalOriginal - totalBrotli) / totalOriginal * 100);
    
    const totalName = 'TOTAL'.padEnd(23);
    const totalOrig = this.formatBytes(totalOriginal).padStart(8);
    const totalGzip = this.formatBytes(totalGzipped).padStart(8);
    const totalGzipR = `${totalGzipRatio.toFixed(1)}%`.padStart(7);
    const totalBrot = this.formatBytes(totalBrotli).padStart(8);
    const totalBrotR = `${totalBrotliRatio.toFixed(1)}%`.padStart(7);

    console.log(`│ ${totalName} │ ${totalOrig} │ ${totalGzip} │ ${totalGzipR} │ ${totalBrot} │ ${totalBrotR} │`);
    console.log('└─────────────────────────┴──────────┴──────────┴─────────┴──────────┴─────────┘\n');
  }

  generateRecommendations(results) {
    console.log('💡 Compression Recommendations:\n');

    results.forEach(result => {
      if (result.gzipRatio < 50 && result.type === 'JavaScript') {
        console.log(`⚠️  ${result.fileName}: Low compression ratio (${result.gzipRatio.toFixed(1)}%). Consider code minification.`);
      }
      
      if (result.gzipRatio < 60 && result.type === 'CSS') {
        console.log(`⚠️  ${result.fileName}: Low compression ratio (${result.gzipRatio.toFixed(1)}%). Consider removing unused CSS.`);
      }
      
      if (result.originalSize > 100000) {
        console.log(`⚠️  ${result.fileName}: Large file size (${this.formatBytes(result.originalSize)}). Consider code splitting.`);
      }
    });

    console.log('\n✅ General Recommendations:');
    console.log('   • Enable gzip/brotli compression on your web server');
    console.log('   • Set appropriate cache headers for static assets');
    console.log('   • Use Content-Encoding: gzip for text-based resources');
    console.log('   • Consider using brotli for even better compression');
    console.log('   • Implement resource hints (preload, prefetch) for critical assets');
  }

  async saveReport(results) {
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: results.length,
        totalOriginalSize: results.reduce((sum, r) => sum + r.originalSize, 0),
        totalGzippedSize: results.reduce((sum, r) => sum + r.gzipSize, 0),
        totalBrotliSize: results.reduce((sum, r) => sum + r.brotliSize, 0),
        averageGzipRatio: results.reduce((sum, r) => sum + r.gzipRatio, 0) / results.length,
        averageBrotliRatio: results.reduce((sum, r) => sum + r.brotliRatio, 0) / results.length
      },
      files: results,
      serverConfiguration: this.generateServerConfig()
    };

    fs.writeFileSync(
      path.join(reportDir, 'compression-analysis.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Report saved to: ./reports/compression-analysis.json');
  }

  generateServerConfig() {
    return {
      nginx: `
# Add to nginx.conf
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types
  text/plain
  text/css
  text/xml
  text/javascript
  application/javascript
  application/xml+rss
  application/json;

# Brotli compression (if available)
brotli on;
brotli_types
  text/plain
  text/css
  text/xml
  text/javascript
  application/javascript
  application/json;
`,
      apache: `
# Add to .htaccess
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
`,
      express: `
// Add to Express.js server
const compression = require('compression');
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));
`
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new GzipAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = GzipAnalyzer;