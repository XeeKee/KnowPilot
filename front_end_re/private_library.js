/**
 * @file Private library file management system for CollabThink.
 * 
 * This module provides comprehensive file upload, storage, and management
 * functionality for users' private documents. It supports drag-and-drop
 * file uploads, file deletion, and integration with the backend storage
 * system. The module handles various file types and provides real-time
 * feedback during file operations.
 */

// Store uploaded files in current session
let uploadedFiles = [];
// Store the saved private files from backend
let savedFiles = []; 

/**
 * Initialize private library functionality when the DOM is loaded.
 * 
 * Sets up event listeners for file upload interactions including
 * drag-and-drop functionality, file selection, and private library
 * button clicks. This function establishes the core user interface
 * for file management operations.
 */
document.addEventListener('DOMContentLoaded', function () {
    const privateLibraryBtn = document.querySelector('.private-library');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    // Click private library button to open file dialog
    privateLibraryBtn.addEventListener('click', function () {
        openFileDialog();
    });

    // Click upload area to trigger file selection
    uploadArea.addEventListener('click', function () {
        fileInput.click();
    });

    // Handle file selection changes
    fileInput.addEventListener('change', function (e) {
        handleFiles(e.target.files);
    });

    // Enable drag and drop functionality for better UX
    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
});

/**
 * Open the file upload dialog and initialize file management interface.
 * 
 * Displays the file upload dialog, clears any previously uploaded files,
 * loads saved private files from the backend, and updates the UI to
 * reflect the current state of the private library.
 * 
 * @returns {Promise<void>} Resolves when the dialog is fully initialized
 */
async function openFileDialog() {
    document.getElementById('file-upload-dialog').style.display = 'flex';
    uploadedFiles = [];
    
    await loadSavedPrivateFiles();
    
    updateFilesList();
    updateConfirmButton();
}

/**
 * Load saved private files from the backend storage system.
 * 
 * Retrieves the list of previously uploaded and saved private files
 * from the server. This function ensures that users can see and manage
 * their existing files when they reopen the private library dialog.
 * 
 * @returns {Promise<void>} Resolves when files are loaded from backend
 */
async function loadSavedPrivateFiles() {
    try {
        console.log('🔄 Loading saved private files...');
        const response = await fetch('/api/get_private_files');
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Backend response:', data); 
        
        if (data.status === 'success' && data.data && data.data.files) {
            savedFiles = data.data.files;
            console.log(`✅ Loaded ${savedFiles.length} saved private files:`, savedFiles);
        } else {
            savedFiles = [];
            console.log('📭 No files found or invalid response format');
            console.log('📊 Response structure:', {
                status: data.status,
                hasData: !!data.data,
                hasFiles: !!(data.data && data.data.files),
                filesCount: data.data && data.data.files ? data.data.files.length : 0
            });
        }
    } catch (error) {
        console.error('❌ Failed to load saved files:', error);
        savedFiles = [];
    }
}

/**
 * Delete a saved private file from the backend storage.
 * 
 * Sends a deletion request to the server for the specified file.
 * This function handles the permanent removal of files from the
 * user's private library storage.
 * 
 * @param {string} fileName - The name of the file to delete
 * @returns {Promise<boolean>} True if deletion was successful, false otherwise
 */
async function deleteSavedFile(fileName) {
    try {
        const response = await fetch('/api/delete_private_file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_name: fileName
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.status === 'success') {
            savedFiles = savedFiles.filter(file => file.name !== fileName);
            updateFilesList();
            console.log(`File "${fileName}" deleted successfully`);
            return true;
        } else {
            throw new Error(data.message || 'Delete failed');
        }
    } catch (error) {
        console.error('Failed to delete file:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification(`Failed to delete file: ${error.message}`, 'error');
        } else {
            alert(`Failed to delete file: ${error.message}`);
        }
        return false;
    }
}

/**
 * Close the file upload dialog and reset file management state.
 * 
 * Hides the file upload dialog, clears the uploaded and saved file lists,
 * and resets the file input field.
 */
function closeFileDialog() {
    document.getElementById('file-upload-dialog').style.display = 'none';
    uploadedFiles = [];
    savedFiles = [];
    document.getElementById('file-input').value = '';
    updateFilesList();
}

/**
 * Handle the selection of files for upload.
 * 
 * Validates and processes the selected files, ensuring they are of
 * supported types and handles legacy .doc files. It also prevents
 * duplicate file selection.
 * 
 * @param {FileList} files - The FileList object containing selected files
 */
function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (isValidFile(file)) {
            // Check if file with same name already exists
            if (!uploadedFiles.some(f => f.name === file.name)) {
                // Special handling for legacy .doc files
                if (file.name.toLowerCase().endsWith('.doc')) {
                    const shouldContinue = confirm(
                        `Warning: ${file.name} is a legacy Word format (.doc).\n\n` +
                        `For best text extraction results, please convert to .docx format.\n\n` +
                        `Continue with limited text extraction?`
                    );
                    if (!shouldContinue) {
                        return;
                    }
                }
                uploadedFiles.push(file);
            } else {
                if (typeof window.showNotification === 'function') {
                    window.showNotification(`File "${file.name}" is already selected.`, 'error');
                } else {
                    alert(`File "${file.name}" is already selected.`);
                }
            }
        } else {
            if (typeof window.showNotification === 'function') {
                window.showNotification('Unsupported file type: ' + file.name + '\nOnly Excel (.xlsx, .xls), PDF (.pdf), Word (.docx, .doc) files are supported', 'error');
            } else {
                alert('Unsupported file type: ' + file.name + '\nOnly Excel (.xlsx, .xls), PDF (.pdf), Word (.docx, .doc) files are supported');
            }
        }
    });

    updateFilesList();
    updateConfirmButton();
}

/**
 * Validate if a file is of a supported type or extension.
 * 
 * Checks if the file's type (MIME) or extension matches any of the
 * allowed file types for text extraction.
 * 
 * @param {File} file - The File object to validate
 * @returns {boolean} True if the file is supported, false otherwise
 */
function isValidFile(file) {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/pdf', // .pdf
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword' // .doc
    ];

    const allowedExtensions = /\.(xlsx|xls|pdf|docx|doc)$/i;

    return allowedTypes.includes(file.type) || allowedExtensions.test(file.name);
}

/**
 * Update the display of uploaded and saved files in the private library.
 * 
 * Generates HTML content for the file list area, displaying both
 * newly uploaded files and previously saved files. It handles
 * responsive text truncation for file names.
 */
function updateFilesList() {
    const filesContainer = document.getElementById('uploaded-files');

    // build the HTML content
    let htmlContent = '';
    
    // display the saved files
    if (savedFiles.length > 0) {
        htmlContent += `
            <div class="saved-files-section">
                <h4 style="margin: 0 0 10px 0; color: #4a6ee0; font-size: 14px;">Saved Private Files (${savedFiles.length})</h4>
                ${savedFiles.map((file, index) => {
                    const uploadTime = file.upload_time ? new Date(file.upload_time * 1000).toLocaleString('en-US') : 'Unknown time';
                    const fileNameLength = file.name.length;
                    let fileNameStyle = '';
                    if (fileNameLength > 30) {
                        fileNameStyle = 'font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;';
                    } else {
                        fileNameStyle = 'font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;';
                    } 
                    
                    return `
                        <div class="file-item saved-file">
                            <div class="file-info">
                                <div class="file-icon">${getFileIconByName(file.name)}</div>
                                <div class="file-details">
                                    <div class="file-name" style="${fileNameStyle}" title="${file.name}">${file.name}</div>
                                    <div class="file-size">${formatFileSize(file.size)} • ${uploadTime}</div>
                                </div>
                            </div>
                            <button class="remove-file delete-saved" onclick="deleteSavedFile('${file.name.replace(/'/g, "\\'")}')">Delete</button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Display the newly uploaded files
    if (uploadedFiles.length > 0) {
        htmlContent += `
            <div class="new-files-section">
                <h4 style="margin: 15px 0 10px 0; color: #28a745; font-size: 14px;">New Uploaded Files (${uploadedFiles.length})</h4>
                ${uploadedFiles.map((file, index) => {

                    const fileNameLength = file.name.length;
                    let fileNameStyle = '';
                    
                    if (fileNameLength > 30) {
                        fileNameStyle = 'font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;';
                    } else if (fileNameLength > 20) {
                        fileNameStyle = 'font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;';
                    } else {
                        fileNameStyle = 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;';
                    }
                    
                    return `
                    <div class="file-item new-file">
                        <div class="file-info">
                            <div class="file-icon">${getFileIcon(file)}</div>
                            <div class="file-details">
                                <div class="file-name" style="${fileNameStyle}" title="${file.name}">${file.name}</div>
                                <div class="file-size">${formatFileSize(file.size)}</div>
                            </div>
                        </div>
                        <button class="remove-file" onclick="removeFile(${index})">Remove</button>
                    </div>
                `}).join('')}
            </div>
        `;
    }

    if (savedFiles.length === 0 && uploadedFiles.length === 0) {
        filesContainer.classList.remove('has-files');
        filesContainer.innerHTML = '';
        return;
    }

    filesContainer.classList.add('has-files');
    filesContainer.innerHTML = htmlContent;
}

/**
 * Get the appropriate icon for a file based on its extension.
 * 
 * Returns a Unicode emoji icon based on the file's extension.
 * 
 * @param {File} file - The File object to get the icon for
 * @returns {string} A Unicode emoji icon
 */
function getFileIcon(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf':
            return '📄';
        case 'xlsx':
        case 'xls':
            return '📊';
        case 'docx':
        case 'doc':
            return '📝';
        default:
            return '📁';
    }
}

/**
 * Get the appropriate icon for a file based on its name.
 * 
 * Returns a Unicode emoji icon based on the file's extension.
 * This function is specifically for saved files, which might have
 * different extensions than newly uploaded files.
 * 
 * @param {string} fileName - The name of the file to get the icon for
 * @returns {string} A Unicode emoji icon
 */
function getFileIconByName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf':
            return '📄';
        case 'xlsx':
        case 'xls':
            return '📊';
        case 'docx':
        case 'doc':
            return '📝';
        default:
            return '📁';
    }
}

/**
 * Format a file size in bytes to a human-readable string.
 * 
 * Converts bytes to KB, MB, GB, etc., and formats it with a unit.
 * 
 * @param {number} bytes - The size in bytes
 * @returns {string} A formatted file size string
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Remove a file from the newly uploaded files list.
 * 
 * This function is called when a user clicks the "Remove" button
 * for a file in the newly uploaded section. It removes the file
 * from the `uploadedFiles` array and updates the display.
 * 
 * @param {number} index - The index of the file to remove
 */
function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateFilesList();
    updateConfirmButton();
}

/**
 * Update the state of the "Send Files" button based on the number of
 * files selected for upload.
 * 
 * Disables the button if no files are selected, otherwise enables it.
 */
function updateConfirmButton() {
    const confirmBtn = document.getElementById('send-files-btn');
    if (confirmBtn) {
        confirmBtn.disabled = uploadedFiles.length === 0;
    } else {
        console.warn('Send files button not found in the DOM');
    }
}

/**
 * Process and send the selected files to the backend for text extraction.
 * 
 * This function orchestrates the file processing pipeline, including
 * text extraction, cleaning, and sending to the backend. It handles
 * the state of the "Processing..." button and provides feedback
 * on the success or failure of the file upload process.
 * 
 * @returns {Promise<void>} Resolves when all files are processed and sent
 */
async function processAndSendFiles() {
    if (uploadedFiles.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select files first', 'error');
        } else {
            alert('Please select files first');
        }
        return;
    }

    const confirmBtn = document.getElementById('send-files-btn');
    const dialog = document.querySelector('.file-upload-dialog');

    // Show processing state
    dialog.classList.add('processing');
    
    if (confirmBtn) {
        confirmBtn.textContent = 'Processing...';
        confirmBtn.disabled = true;
    }

    try {
        // Process each file
        const processedFiles = [];

        for (let file of uploadedFiles) {
            const textContent = await extractTextFromFile(file);

            // Final text cleaning before sending to backend
            const finalCleanedContent = cleanExtractedText(textContent);

            // Validate that we have meaningful content
            if (!finalCleanedContent || finalCleanedContent.trim().length === 0) {
                console.warn(`Warning: File ${file.name} produced no readable content`);
            }

            processedFiles.push({
                name: file.name,
                content: finalCleanedContent,
                type: file.type,
                size: file.size,
                extractedLength: finalCleanedContent.length,
                originalSize: file.size
            });

            console.log(`Processed ${file.name}: ${finalCleanedContent.length} characters extracted`);

            // Log content preview for debugging (first 200 characters)
            const preview = finalCleanedContent.length > 200
                ? finalCleanedContent.substring(0, 200) + '...'
                : finalCleanedContent;
            console.log(`Content preview: ${preview}`);
        }

        // Send to backend
        await sendFilesToBackend(processedFiles);

        // 重新加载已保存的文件
        await loadSavedPrivateFiles();
        
        // 清空新上传的文件列表
        uploadedFiles = [];
        updateFilesList();
        updateConfirmButton();

        // Show success message with stats
        const totalChars = processedFiles.reduce((sum, file) => sum + file.extractedLength, 0);
        if (typeof window.showNotification === 'function') {
            window.showNotification(`File upload successful!\nProcessed ${processedFiles.length} files, ${totalChars} characters of text content.`, 'success');
        } else {
            alert(`File upload successful!\nProcessed ${processedFiles.length} files, ${totalChars} characters of text content.`);
        }

    } catch (error) {
        console.error('File processing failed:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('File processing failed: ' + error.message, 'error');
        } else {
            alert('File processing failed: ' + error.message);
        }
    } finally {
        // Restore button state
        dialog.classList.remove('processing');
        if (confirmBtn) {
            confirmBtn.textContent = 'Send Files';
            confirmBtn.disabled = false;
        }
    }
}

/**
 * Extract text content from a single file.
 * 
 * Determines the appropriate extraction method based on the file's
 * extension (PDF, Excel, Word) and returns a Promise that resolves
 * with the extracted text content.
 * 
 * @param {File} file - The File object to extract text from
 * @returns {Promise<string>} A Promise that resolves with the extracted text
 */
async function extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
        const fileName = file.name.toLowerCase();

        try {
            if (fileName.endsWith('.pdf')) {
                // PDF file processing using PDF.js
                extractPDFText(file, resolve, reject);
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                // Excel file processing using Sheet.JS
                extractExcelData(file, resolve, reject);
            } else if (fileName.endsWith('.docx')) {
                // Word .docx file processing using mammoth.js
                extractWordDocx(file, resolve, reject);
            } else if (fileName.endsWith('.doc')) {
                // Legacy .doc files are not supported by mammoth.js
                const content = `Legacy .doc format is not supported. Please convert to .docx format for text extraction.`;
                resolve(cleanExtractedText(content));
            } else {
                reject(new Error('Unsupported file type'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Extract text from PDF files using PDF.js.
 * 
 * Utilizes the PDF.js library to read and extract text content from
 * PDF documents. It processes each page sequentially and combines
 * the text content.
 * 
 * @param {File} file - The PDF File object
 * @param {Function} resolve - The function to call on successful extraction
 * @param {Function} reject - The function to call on extraction failure
 */
function extractPDFText(file, resolve, reject) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const arrayBuffer = e.target.result;

        // 设置PDF.js worker路径
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/static/libs/pdf.worker.min.js';

            // load the PDF document
            pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(function (pdf) {
                const maxPages = pdf.numPages;
                const textPromises = [];

                // extract the text from each page
                for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                    textPromises.push(
                        pdf.getPage(pageNum).then(function (page) {
                            return page.getTextContent().then(function (textContent) {
                                return textContent.items.map(item => item.str).join(' ');
                            });
                        })
                    );
                }

                // wait for all pages to be processed
                Promise.all(textPromises).then(function (pagesText) {
                    const fullText = pagesText.join('\n\n');

                    if (fullText && fullText.trim().length > 0) {
                        const cleanedText = cleanExtractedText(fullText);
                        resolve(cleanedText); 
                    } else {
                        resolve("Document appears to be empty or contains only images/non-text content.");
                    }
                }).catch(function (error) {
                    console.error('Error extracting text from PDF pages:', error);
                    reject(new Error(`Failed to extract text from PDF: ${error.message}`));
                });

            }).catch(function (error) {
                console.error('Error loading PDF document:', error);
                reject(new Error(`Failed to load PDF document: ${error.message}`));
            });
        } else {
            reject(new Error('PDF.js library not loaded'));
        }
    };

    reader.onerror = function () {
        reject(new Error('Failed to read PDF file'));
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Extract data from Excel files using Sheet.JS.
 * 
 * Utilizes the Sheet.JS library to read and extract text content from
 * Excel spreadsheets. It reads all sheets and combines the text content.
 * 
 * @param {File} file - The Excel File object
 * @param {Function} resolve - The function to call on successful extraction
 * @param {Function} reject - The function to call on extraction failure
 */
function extractExcelData(file, resolve, reject) {
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);

            // use Sheet.JS to read the Excel file
            const workbook = XLSX.read(data, { type: 'array' });

            let allText = '';

            // 遍历所有工作表
            workbook.SheetNames.forEach(function (sheetName) {
                const worksheet = workbook.Sheets[sheetName];

                // 将工作表转换为JSON数据
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length > 0) {
                    allText += `\n\n=== Sheet: ${sheetName} ===\n`;

                    // 将每行数据转换为文本
                    jsonData.forEach(function (row, rowIndex) {
                        if (row && row.length > 0) {
                            // 过滤空值并连接单元格数据
                            const rowText = row.filter(cell => cell !== null && cell !== undefined && cell !== '').join(' | ');
                            if (rowText.trim()) {
                                allText += `Row ${rowIndex + 1}: ${rowText}\n`;
                            }
                        }
                    });
                }
            });

            if (allText && allText.trim().length > 0) {
                const cleanedText = cleanExtractedText(allText);
                resolve(cleanedText); 
            } else {
                resolve("Spreadsheet appears to be empty or contains no readable data.");
            }

        } catch (error) {
            console.error('Error processing Excel file:', error);
            reject(new Error(`Failed to process Excel file: ${error.message}`));
        }
    };

    reader.onerror = function () {
        reject(new Error('Failed to read Excel file'));
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Clean the extracted text content by removing extra whitespace and
 * normalizing line endings.
 * 
 * This function ensures that the text is free of excessive whitespace,
 * consistent line endings, and removes any artifacts that might interfere
 * with text extraction or processing.
 * 
 * @param {string} text - The raw extracted text
 * @returns {string} The cleaned text content
 */
function cleanExtractedText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .trim()                           // Remove leading and trailing whitespace
        .replace(/\r\n/g, '\n')          // Normalize line endings
        .replace(/[ \t]+/g, ' ')         // Replace multiple spaces/tabs with single space
        .replace(/\n /g, '\n')           // Remove spaces at beginning of lines
        .replace(/ \n/g, '\n')           // Remove spaces at end of lines
        .replace(/\n\s*\n\s*\n+/g, '\n\n') // Replace multiple empty lines with single empty line
        .replace(/(\[.*?\])\n\n+/g, '$1\n') // Remove extra empty lines after document headers
        .replace(/(\[.*?\])\n\s+/g, '$1\n'); // Remove spaces after document headers
}

/**
 * Extract text from Word .docx files using mammoth.js.
 * 
 * Utilizes the mammoth.js library to read and extract text content from
 * .docx Word documents. It processes the raw text content and removes
 * any potential formatting artifacts.
 * 
 * @param {File} file - The .docx File object
 * @param {Function} resolve - The function to call on successful extraction
 * @param {Function} reject - The function to call on extraction failure
 */
function extractWordDocx(file, resolve, reject) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const arrayBuffer = e.target.result;

        // Use mammoth.js to extract text from .docx file
        mammoth.extractRawText({ arrayBuffer: arrayBuffer })
            .then(function (result) {
                const text = result.value; // The raw text
                const messages = result.messages; // Any messages, such as warnings during conversion

                if (messages.length > 0) {
                    console.log('Mammoth.js conversion messages:', messages);
                }

                if (text && text.trim().length > 0) {
                    const cleanedText = cleanExtractedText(text);
                    resolve(cleanedText);
                } else {
                    resolve("Document appears to be empty or contains only non-text content.");
                }
            })
            .catch(function (error) {
                console.error('Error extracting text from Word document:', error);
                reject(new Error(`Failed to extract text from Word document: ${error.message}`));
            });
    };

    reader.onerror = function () {
        reject(new Error('Failed to read Word document file'));
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Send the processed files to the backend for storage and processing.
 * 
 * Constructs the payload for the backend upload endpoint and sends it
 * via a POST request. It includes the file type, content, and metadata.
 * 
 * @param {Array<Object>} processedFiles - An array of processed file objects
 * @returns {Promise<Object>} A Promise that resolves with the backend response
 */
async function sendFilesToBackend(processedFiles) {
    const payload = {
        type: 'private_information',
        files: processedFiles,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/upload_private_files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Network request failed: ' + response.status);
        }

        const result = await response.json();
        console.log('Files uploaded successfully:', result);

        return result;

    } catch (error) {
        console.error('Failed to send files to backend:', error);
        throw error;
    }
}
