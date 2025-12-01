// script.js - Image -> PDF converter (client-side)
// Requires: Cropper.js and jsPDF loaded in index.html
// Author: Paperly sample app

(() => {
  const { jsPDF } = window.jspdf;

  // Elements
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('file-input');
  const selectBtn = document.getElementById('select-btn');
  const thumbList = document.getElementById('thumb-list');
  const emptyHint = document.getElementById('empty-hint');
  const generateBtn = document.getElementById('generate-btn');
  const clearBtn = document.getElementById('clear-btn');
  const qualitySelect = document.getElementById('quality');
  const pageSizeSelect = document.getElementById('page-size');
  const orientationSelect = document.getElementById('orientation');

  // Crop modal elements
  const cropModal = document.getElementById('crop-modal');
  const cropImage = document.getElementById('crop-image');
  const cropSave = document.getElementById('crop-save');
  const closeCrop = document.getElementById('close-crop');
  const resetCrop = document.getElementById('reset-crop');

  let cropper = null;
  let currentCropIndex = null;

  // App state: array of {id, file, dataUrl, name}
  const images = [];

  // Helpers
  function uid() {
    return 'id_' + Math.random().toString(36).slice(2, 9);
  }

  function updateEmptyHint() {
    emptyHint.style.display = images.length ? 'none' : 'block';
  }

  function readFileAsDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  // Create a thumbnail card
  function createThumbCard(imgObj, index) {
    const card = document.createElement('div');
    card.className = 'thumb';
    card.dataset.id = imgObj.id;

    const img = document.createElement('img');
    img.src = imgObj.dataUrl;
    img.alt = imgObj.name;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span class="name">${imgObj.name}</span><span class="size">${Math.round(imgObj.file.size/1024)} KB</span>`;

    const controls = document.createElement('div');
    controls.className = 'controls';

    const cropBtn = document.createElement('button');
    cropBtn.className = 'small-btn';
    cropBtn.textContent = 'Crop';
    cropBtn.addEventListener('click', () => openCropModal(imgObj.id));

    const upBtn = document.createElement('button');
    upBtn.className = 'small-btn';
    upBtn.textContent = '↑';
    upBtn.title = 'Move up';
    upBtn.addEventListener('click', () => moveImage(imgObj.id, -1));

    const downBtn = document.createElement('button');
    downBtn.className = 'small-btn';
    downBtn.textContent = '↓';
    downBtn.title = 'Move down';
    downBtn.addEventListener('click', () => moveImage(imgObj.id, +1));

    const removeBtn = document.createElement('button');
    removeBtn.className = 'small-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeImage(imgObj.id));

    controls.append(cropBtn, upBtn, downBtn, removeBtn);
    card.append(img, meta, controls);
    return card;
  }

  function renderThumbnails() {
    thumbList.innerHTML = '';
    images.forEach((imgObj, i) => {
      thumbList.appendChild(createThumbCard(imgObj, i));
    });
    updateEmptyHint();
  }

  function addFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    Promise.all(files.map(async file => {
      const dataUrl = await readFileAsDataURL(file);
      const obj = { id: uid(), file, dataUrl, name: file.name };
      images.push(obj);
    })).then(() => renderThumbnails());
  }

  // Drag and drop handlers
  ['dragenter','dragover'].forEach(ev => {
    dropArea.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.add('drag-over');
    });
  });
  ['dragleave','drop'].forEach(ev => {
    dropArea.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove('drag-over');
    });
  });
  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (!dt) return;
    addFiles(dt.files);
  });

  // File input interactions
  selectBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => addFiles(e.target.files));

  // List manipulation
  function findIndexById(id) {
    return images.findIndex(x => x.id === id);
  }
  function removeImage(id) {
    const idx = findIndexById(id);
    if (idx >= 0) images.splice(idx, 1);
    renderThumbnails();
  }
  function moveImage(id, dir) {
    const idx = findIndexById(id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= images.length) return;
    const [item] = images.splice(idx, 1);
    images.splice(newIdx, 0, item);
    renderThumbnails();
  }

  // Crop modal functions
  function openCropModal(id) {
    const idx = findIndexById(id);
    if (idx < 0) return;
    currentCropIndex = idx;
    cropImage.src = images[idx].dataUrl;
    cropModal.setAttribute('aria-hidden', 'false');

    // create cropper after image loads
    cropImage.onload = () => {
      if (cropper) cropper.destroy();
      cropper = new Cropper(cropImage, {
        viewMode: 1,
        background: false,
        autoCropArea: 0.9,
        responsive: true,
        movable: true,
        zoomable: true,
        scalable: false,
        rotatable: false,
      });
    };
  }

  function closeCropModal() {
    cropModal.setAttribute('aria-hidden', 'true');
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    currentCropIndex = null;
    cropImage.src = '';
  }

  cropSave.addEventListener('click', async () => {
    if (!cropper || currentCropIndex === null) return;
    const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: 'high' });
    // convert canvas to blob and replace item
    canvas.toBlob(async (blob) => {
      const file = new File([blob], images[currentCropIndex].name, { type: 'image/jpeg' });
      const dataUrl = await readFileAsDataURL(file);
      images[currentCropIndex].file = file;
      images[currentCropIndex].dataUrl = dataUrl;
      renderThumbnails();
      closeCropModal();
    }, 'image/jpeg', 0.95);
  });

  closeCrop.addEventListener('click', closeCropModal);
  resetCrop.addEventListener('click', () => {
    if (cropper) cropper.reset();
  });

  // Clear all
  clearBtn.addEventListener('click', () => {
    if (!images.length) return;
    images.splice(0, images.length);
    renderThumbnails();
  });

  // PDF generation
  generateBtn.addEventListener('click', async () => {
    if (!images.length) {
      alert('Please add at least one image.');
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Processing...';

    try {
      const quality = parseFloat(qualitySelect.value) || 0.8;
      const orientation = orientationSelect.value || 'portrait';
      const pageSize = pageSizeSelect.value || 'a4';

      // Create jsPDF instance
      const pdf = new jsPDF({
        unit: 'mm',
        format: pageSize === 'custom' ? 'a4' : pageSize,
        orientation: orientation
      });

      // Loop images and add to PDF
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        // Load image to canvas to control quality & dimensions
        const imgEl = await loadImageForCanvas(img.dataUrl);
        const canvas = document.createElement('canvas');

        // Fit image to page aspect while preserving resolution
        // get pdf page dimensions in px equivalent (approx)
        const mmToPx = (mm) => mm * 3.7795275591; // approx px per mm at 96dpi
        let pageWidthMM = 210, pageHeightMM = 297;
        if (pageSize === 'letter') { pageWidthMM = 215.9; pageHeightMM = 279.4; }
        if (pageSize === 'a4') { pageWidthMM = 210; pageHeightMM = 297; }
        if (orientation === 'landscape') [pageWidthMM, pageHeightMM] = [pageHeightMM, pageWidthMM];

        // Convert page mm to pixel canvas size (preserve aspect ratio)
        const targetW = Math.round(mmToPx(pageWidthMM));
        const targetH = Math.round(mmToPx(pageHeightMM));

        // compute fit
        const ratio = Math.min(targetW / imgEl.naturalWidth, targetH / imgEl.naturalHeight);
        const drawW = Math.round(imgEl.naturalWidth * ratio);
        const drawH = Math.round(imgEl.naturalHeight * ratio);

        canvas.width = drawW;
        canvas.height = drawH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imgEl, 0, 0, drawW, drawH);

        // get data URL compressed by quality
        const dataURL = canvas.toDataURL('image/jpeg', quality);

        // Convert mm to jsPDF units and center image on page
        const pdfW = pageWidthMM;
        const pdfH = pageHeightMM;
        // image width and height in mm
        const imgMMWidth = (drawW / mmToPx(1)); // pixels -> mm approximation invert mmToPx(1) = 3.7795 px per mm
        const imgMMHeight = (drawH / mmToPx(1));

        const x = (pdfW - imgMMWidth) / 2;
        const y = (pdfH - imgMMHeight) / 2;

        if (i > 0) pdf.addPage();
        pdf.addImage(dataURL, 'JPEG', x, y, imgMMWidth, imgMMHeight);
      }

      // Save PDF
      pdf.save('paperly-export.pdf');

    } catch (err) {
      console.error(err);
      alert('Error creating PDF. See console for details.');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate PDF';
    }
  });

  // Utility: create HTMLImageElement from dataURL and wait load
  function loadImageForCanvas(dataUrl) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = dataUrl;
    });
  }

  // Initialize
  updateEmptyHint();
  renderThumbnails();

  // Expose a global demo function (optional)
  window.__paperly = {
    addFiles
  };
})();
