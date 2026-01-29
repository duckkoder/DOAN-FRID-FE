/**
 * Canvas Web Worker - Xử lý frame capture off main thread
 * Sử dụng OffscreenCanvas để không block UI
 */

// eslint-disable-next-line no-restricted-globals
const workerSelf = self;

let offscreenCanvas = null;
let offscreenCtx = null;

/**
 * Ensure canvas is initialized with correct size
 * Auto-creates canvas if needed
 */
function ensureCanvas(width, height) {
  if (!offscreenCanvas || offscreenCanvas.width !== width || offscreenCanvas.height !== height) {
    offscreenCanvas = new OffscreenCanvas(width, height);
    offscreenCtx = offscreenCanvas.getContext('2d');
  }
  return offscreenCtx !== null;
}

/**
 * Process frame: draw ImageBitmap and convert to Blob
 * Auto-initializes canvas based on ImageBitmap size
 */
async function processFrame(imageBitmap, quality) {
  // Validate ImageBitmap
  if (!imageBitmap) {
    throw new Error('ImageBitmap is null or undefined');
  }
  
  if (typeof imageBitmap.width !== 'number' || typeof imageBitmap.height !== 'number') {
    throw new Error('Invalid ImageBitmap - missing dimensions');
  }

  const width = imageBitmap.width;
  const height = imageBitmap.height;
  
  if (width === 0 || height === 0) {
    throw new Error('ImageBitmap has zero dimensions');
  }
  
  // Auto-init canvas với kích thước của ImageBitmap
  if (!ensureCanvas(width, height)) {
    if (imageBitmap.close) imageBitmap.close();
    throw new Error('Failed to create canvas context');
  }

  // Draw image
  offscreenCtx.drawImage(imageBitmap, 0, 0);
  
  // Close the ImageBitmap to free memory
  if (imageBitmap.close) {
    imageBitmap.close();
  }

  // Convert to blob
  const blob = await offscreenCanvas.convertToBlob({
    type: 'image/jpeg',
    quality: quality || 0.8
  });

  return blob;
}

/**
 * Handle messages from main thread
 */
workerSelf.onmessage = async function(event) {
  const message = event.data;

  try {
    switch (message.type) {
      case 'processFrame': {
        const startTime = performance.now();
        // imageBitmap và quality nằm trực tiếp trong message
        const blob = await processFrame(message.imageBitmap, message.quality);
        const processingTime = performance.now() - startTime;
        
        // Send blob back to main thread
        workerSelf.postMessage({
          type: 'frame_result',
          id: message.id,
          blob,
          processingTime
        });
        break;
      }

      case 'ping': {
        // Health check
        workerSelf.postMessage({ type: 'pong', id: message.id });
        break;
      }

      default:
        workerSelf.postMessage({
          type: 'error',
          id: message.id,
          error: `Unknown message type: ${message.type}`
        });
    }
  } catch (error) {
    workerSelf.postMessage({
      type: 'error',
      id: message.id,
      error: error.message || 'Unknown error in worker'
    });
  }
};

// Signal that worker is ready
workerSelf.postMessage({ type: 'ready' });
