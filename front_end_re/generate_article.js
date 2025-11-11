/**
 * Article generation JavaScript file
 * 
 * Note: This file depends on common functions in article_utils.js
 * - formatChapterContent: Format chapter content
 * - getCurrentArticleContent: Get current article content
 * - showNotification: Show notification
 * - getCurrentOutlineText: Get current outline text
 * - showRegenerateDialog: Show regeneration dialog
 * - toggleChapter: Toggle chapter expand/collapse
 * - toggleAllChapters: Expand/collapse all chapters
 * - displayChapterError: Display chapter error
 * - displayArticleComplete: Display article completion interface
 * 
 * Invisible watermark functionality:
 * 1. Zero-width character watermark: Insert invisible zero-width characters in text to encode AI generation info
 * 2. HTML metadata watermark: Add hidden AI generation identifier in HTML head
 * 3. CSS invisible elements: Create invisible AI identifier elements through CSS
 * 4. Detection method: Use detectAIWatermark(text) function to detect invisible watermarks in text
 * 
 * Usage examples:
 * - Run in browser console: detectAIWatermark(document.body.innerText)
 * - Copy text from PDF/Word, then run: detectAIWatermark("pasted text")
 */

// Global variables
let isFullGeneration = true; // Whether it's full generation mode
let outlineData = ''; // Outline data
let totalChapters = 0; // Total chapter count
let completedChaptersCount = 0; // Completed chapter count

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('generate-article-btn')) {
            generateArticle();
        }
    });



    // Function to generate article
         async function generateArticle() {
        if (window.autoCollapseSidebar) {
            window.autoCollapseSidebar();
        }
        if (typeof window.updateOutlineData === 'function') {
            console.log('调用全局 updateOutlineData 函数同步数据');
            window.updateOutlineData();
        }
         outlineData = window.getCurrentOutlineText();
        if (!outlineData) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('Please generate an outline or add outline content first', 'error');
            } else {
                alert('Please generate an outline or add outline content first');
            }
            return;
        }

        console.log('准备发送大纲到后端生成文章:', outlineData);
        try {
            console.log('开始更新后端大纲...');
            const updateResult = await updateOutlineInBackend(outlineData);
            console.log('后端大纲更新成功:', updateResult);
            
            showNotification('Outline synchronized to backend', 'success');
        } catch (error) {
            console.error('更新后端大纲失败:', error);
            
            showNotification(`Outline sync failed: ${error.message}, but will continue generating article`, 'warning');
        }
         const chapters = outlineData.split('\n').filter(line => line.trim().startsWith('#'));
         totalChapters = chapters.length;
         
         completedChaptersCount = 0;
         isFullGeneration = true;
         
         initializeArticleContainer();
         
         await generateArticleStream();
     }
    // Export as global function
    window.initializeArticleContainer = initializeArticleContainer;
    // Stream article generation function
     async function generateArticleStream() {
         try {
             console.log('开始流式生成文章，总章节数:', totalChapters);
             
             showOverallProgress();
             
             const response = await fetch('/api/generate/articles', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({
                     type: 'generate_article',
                     outline: outlineData,
                    topic: window.currentTopic || "",  
                     pos: window.getCurrentPos ? window.getCurrentPos() : 0
                 })
             });

             if (!response.ok) {
                 throw new Error(`HTTP ${response.status}: ${response.statusText}`);
             }

             const reader = response.body.getReader();
             const decoder = new TextDecoder();
             let buffer = '';

             while (true) {
                 const { done, value } = await reader.read();
                 if (done) break;

                 buffer += decoder.decode(value, { stream: true });
                 
                 let lines = buffer.split('\n');
                buffer = lines.pop();

                 for (const line of lines) {
                     if (line.trim()) {
                         await handleStreamLine(line.trim());
                     }
                 }
             }
             
             if (buffer.trim()) {
                 await handleStreamLine(buffer.trim());
             }

         } catch (error) {
             console.error('流式生成文章失败:', error);
             showNotification(`Article generation failed: ${error.message}`, 'error');
             cleanupLoadingStates();
         }
     }
     
    // Show overall progress
     function showOverallProgress() {
         const container = document.getElementById('article-display-container');
         
         const progressElement = document.createElement('div');
         progressElement.id = 'overall-progress';
         progressElement.style.cssText = `
             margin: 20px 0;
             padding: 20px;
             background: #f8f9fa;
             border-radius: 8px;
             text-align: center;
             border: 1px solid #e9ecef;
         `;
         
         progressElement.innerHTML = `
             <h3 style="margin: 0 0 15px 0; color: #333;">📝 Generating Article</h3>
             <div style="background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                 <div id="progress-bar" style="width: 0%; height: 20px; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.5s ease; border-radius: 10px;"></div>
             </div>
             <p id="progress-text" style="margin: 10px 0 0 0; color: #666;">Starting generation... (0/${totalChapters} chapters completed)</p>
         `;
         
         container.appendChild(progressElement);
     }
     
    // Update progress
     function updateProgress() {
         const progressBar = document.getElementById('progress-bar');
         const progressText = document.getElementById('progress-text');
         
         if (progressBar && progressText) {
             const currentCompleted = typeof window.completedChaptersCount !== 'undefined' ? window.completedChaptersCount : completedChaptersCount;
             const currentTotal = typeof window.totalChapters !== 'undefined' ? window.totalChapters : totalChapters;
             
             const percentage = (currentCompleted / currentTotal) * 100;
             progressBar.style.width = `${percentage}%`;
             progressText.textContent = `Generating articles... (${currentCompleted}/${currentTotal} chapters completed)`;
         }
     }
     
    // Remove progress display
     function removeProgress() {
         const progressElement = document.getElementById('overall-progress');
         if (progressElement) {
             progressElement.remove();
         }
     }
     
    // Handle each streamed line
     async function handleStreamLine(line) {
         console.log('Processing stream line:', line);
         
         if (line.startsWith('CHAPTER_DATA:')) {
             try {
                 const jsonStr = line.substring('CHAPTER_DATA:'.length);
                 const chapterData = JSON.parse(jsonStr);
                 
                 console.log('接收到章节数据:', chapterData);
                 
                 if (window.saveChapterData && chapterData.references) {
                     window.saveChapterData({
                         index: chapterData.index,
                         references: chapterData.references,
                         title: chapterData.title || `Chapter ${chapterData.index + 1}`
                     });
                 }
                 
                 window.createCollapsibleChapter(chapterData);
                 
                 if (typeof window.completedChaptersCount !== 'undefined') {
                     window.completedChaptersCount++;
                     console.log(`已完成章节数: ${window.completedChaptersCount}/${window.totalChapters || totalChapters}`);
                 } else {
                     completedChaptersCount++;
                     console.log(`已完成章节数: ${completedChaptersCount}/${totalChapters}`);
                 }
                 
                 updateProgress();
                 
             } catch (error) {
                 console.error('解析章节数据失败:', error);
                 showNotification('Failed to parse chapter data', 'error');
             }
             
         } else if (line.startsWith('CHAPTER_ERROR:')) {
             try {
                 const jsonStr = line.substring('CHAPTER_ERROR:'.length);
                 const errorData = JSON.parse(jsonStr);
                 
                 console.log('接收到章节错误:', errorData);
                 
                    displayChapterNetworkError(errorData);
                    
                    console.log('网络错误，中断文章生成过程');
                    showNotification('Article generation stopped due to network error. Click "Retry" to continue.', 'warning');
                    
                    cleanupLoadingStates();
                    
                    throw new Error('Network error occurred, generation stopped');             
                 
             } catch (error) {
                 console.error('解析章节错误失败:', error);
                 
                 if (error.message === 'Network error occurred, generation stopped') {
                    throw error; 
                 }
             }
             
         } else if (line === 'ARTICLE_COMPLETE') {
             console.log('文章生成完成');
             
             removeProgress();
             
             showNotification('Article generation completed!', 'success');
             window.displayArticleComplete([]);
             cleanupLoadingStates();
             
             setTimeout(async () => {
                 console.log('开始自动保存文章到历史记录...');
                 try {
                     const saveResult = await window.saveCompleteArticleToHistory();
                     if (saveResult) {
                         console.log('文章自动保存成功');
                         showNotification('Article saved to history automatically', 'success');
                     } else {
                         console.warn('文章自动保存操作未能完成');
                     }
                 } catch (error) {
                     console.error('自动保存文章失败:', error);
                 }
            }, 1000); 
         }
     }
     window.handleStreamLine = handleStreamLine;

    // Update outline in backend (session-based API)
     async function updateOutlineInBackend(outlineContent) {
         console.log('updateOutlineInBackend 被调用，大纲内容长度:', outlineContent.length);
         console.log('大纲内容预览:', outlineContent.substring(0, 200) + '...');
         
         try {
             const currentPos = window.getCurrentPos ? window.getCurrentPos() : 0;
             
             const requestBody = {
                 outline_content: outlineContent,
                 pos: currentPos
             };
             
             console.log('发送请求到 /api/session/outline');
             const response = await fetch('/api/session/outline', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify(requestBody)
             });

             console.log('收到响应，状态码:', response.status);
             
             if (!response.ok) {
                 const errorText = await response.text();
                 console.error('HTTP错误响应:', errorText);
                 throw new Error(`HTTP错误: ${response.status} - ${errorText}`);
             }

             const data = await response.json();
             console.log('解析响应数据:', data);
             
             if (data.status === 'success') {
                 console.log('大纲更新成功:', data.message);
                 console.log('返回的数据:', data);
                 return data;
             } else {
                 throw new Error(data.message || '更新大纲失败');
             }
         } catch (error) {
             console.error('更新后端大纲时出错:', error);
             throw error;
         }
     }

    // Cleanup all loading states
     function cleanupLoadingStates() {
         console.log('清理加载状态...');
         
         const indicators = document.querySelectorAll('.generating-indicator');
         indicators.forEach(indicator => {
             console.log('移除生成指示器:', indicator);
             indicator.remove();
         });
         
         const wavLoaders = document.querySelectorAll('.wave-loader');
         wavLoaders.forEach(loader => {
             const tempChapterItem = loader.closest('.chapter-item');
             if (tempChapterItem) {
                 console.log('移除临时章节结构:', tempChapterItem.id);
                 tempChapterItem.remove();
             }
         });
         
         const loadingElements = document.querySelectorAll('.loading-indicator, .spinner');
         loadingElements.forEach(element => {
             console.log('移除加载元素:', element);
             element.remove();
         });
         
         const globalLoading = document.querySelector('.outline-loading, .article-loading');
         if (globalLoading) {
             console.log('移除全局加载覆盖层');
             globalLoading.remove();
         }
         
         const generateBtn = document.querySelector('.generate-article-btn');
         if (generateBtn) {
             generateBtn.disabled = false;
             generateBtn.textContent = 'Generate';
         }
     }
     window.cleanupLoadingStates = cleanupLoadingStates;
    
     window.addEventListener('error', function(event) {
         console.error('全局错误:', event.error);
         cleanupLoadingStates();
         showNotification('An unexpected error occurred', 'error');
     });
     
     window.addEventListener('unhandledrejection', function(event) {
         console.error('未处理的Promise拒绝:', event.reason);
         cleanupLoadingStates();
         showNotification('Network or processing error occurred', 'error');
     });


     function initializeArticleContainer() {
         const articleContainer = window.createArticleContainer("Generated Article", "#4caf50");
         
         window.totalChapters = totalChapters;
         window.completedChaptersCount = completedChaptersCount;
         window.outlineData = outlineData;
         
         const exampleBlocksContainer = document.querySelector('.example-blocks-container');
         
         if (exampleBlocksContainer) {
             exampleBlocksContainer.insertAdjacentElement('afterend', articleContainer);
         } else {
             const fallbackContainer = document.getElementById('main-content') || document.body;
             fallbackContainer.appendChild(articleContainer);
         }
         
         const titleElement = document.createElement('h1');
         titleElement.textContent = 'Generating...';
         titleElement.style.cssText = `
             text-align: center;
             color: #333;
             margin-bottom: 30px;
             font-size: 26.7px;
         `;
         articleContainer.appendChild(titleElement);
     }

      function createCollapsibleChapter(chapterData) {
          const container = document.getElementById('article-display-container');
          
          const chapterElement = window.createChapterElement(chapterData, chapterData.index, 'generation');
          
          const existingChapters = container.querySelectorAll('.chapter-item');
          let insertPosition = null;
          
          for (let i = 0; i < existingChapters.length; i++) {
              const existingChapter = existingChapters[i];
              const existingIndex = parseInt(existingChapter.id.replace('chapter-', ''));
              if (existingIndex > chapterData.index) {
                  insertPosition = existingChapter;
                  break;
              }
          }
          
          if (insertPosition) {
              container.insertBefore(chapterElement, insertPosition);
          } else {
              container.appendChild(chapterElement);
          }
          
          setTimeout(() => {
              chapterElement.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.2)';
              setTimeout(() => {
                  chapterElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }, 1000);
          }, 100);
          
          chapterElement.scrollIntoView({ behavior: 'smooth' });
      }
      
      // Expose createCollapsibleChapter globally for retry usage
      window.createCollapsibleChapter = createCollapsibleChapter;


      document.addEventListener('regenerate-chapter-feedback', (event) => {
          const { chapterIndex, chapterTitle, currentContent, feedback } = event.detail;
          window.regenerateChapterWithFeedback(
              chapterIndex, 
              chapterTitle, 
              currentContent, 
              feedback, 
              window.saveModifiedArticleToHistory 
          );
      });




});

/**
 * Display chapter network error with retry button
 * @param {Object} errorData contains index, title, error, error_type
 */
function displayChapterNetworkError(errorData) {
    const container = document.getElementById('article-display-container');
    
    const errorElement = document.createElement('div');
    errorElement.id = `chapter-error-${errorData.index}`;
    errorElement.className = 'chapter-error network-error';
    errorElement.dataset.index = errorData.index;
    errorElement.style.cssText = `
        border: 1px solid #ffcdd2;
        border-radius: 8px;
        margin: 15px 0;
        padding: 20px;
        background: #ffebee;
        color: #d32f2f;
        position: relative;
    `;
    
    errorElement.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #d32f2f;">⚠️ ${errorData.title || `Chapter ${errorData.index + 1}`} - Network Error</h3>
            <div>
                <button onclick="retryChapterGeneration(${errorData.index})" class="retry-btn" style="
                    background: #ff9800; 
                    color: white; 
                    border: none; 
                    padding: 8px 16px; 
                    border-radius: 4px; 
                    cursor: pointer; 
                    font-weight: bold;
                    transition: all 0.3s ease;
                ">🔄 Retry</button>
            </div>
        </div>
        <div style="margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Error Type:</strong> Network/Connection Error</p>
            <p style="margin: 5px 0;"><strong>Error Details:</strong> ${errorData.error}</p>
            <p style="margin: 5px 0; color: #666; font-style: italic;">This error is usually caused by network connectivity issues or server timeouts. Click the Retry button to attempt generation again.</p>
        </div>
        <div class="retry-status" style="display: none; padding: 10px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; color: #1976d2;">
            <span class="retry-message">Retrying...</span>
        </div>
    `;
    const retryBtn = errorElement.querySelector('.retry-btn');
    
    if (retryBtn) {
        retryBtn.addEventListener('mouseenter', () => {
            retryBtn.style.background = '#f57c00';
            retryBtn.style.transform = 'scale(1.05)';
        });
        retryBtn.addEventListener('mouseleave', () => {
            retryBtn.style.background = '#ff9800';
            retryBtn.style.transform = 'scale(1)';
        });
    }
    const existingElements = container.querySelectorAll('.chapter-item, .chapter-error');
    let insertPosition = null;
    
    for (let i = 0; i < existingElements.length; i++) {
        const element = existingElements[i];
        const elementIndex = parseInt(element.dataset.index || element.id.split('-').pop());
        if (elementIndex > errorData.index) {
            insertPosition = element;
            break;
        }
    }
    
    if (insertPosition) {
        container.insertBefore(errorElement, insertPosition);
    } else {
        container.appendChild(errorElement);
    }
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Retry chapter generation
 * @param {number} chapterIndex chapter index
 */
async function retryChapterGeneration(chapterIndex) {
    console.log(`重试生成章节 ${chapterIndex + 1}`);
    
    const errorElement = document.getElementById(`chapter-error-${chapterIndex}`);
    if (!errorElement) return;
    
    const retryStatus = errorElement.querySelector('.retry-status');
    const retryBtn = errorElement.querySelector('.retry-btn');
    
    if (retryStatus && retryBtn) {
        retryStatus.style.display = 'block';
        retryBtn.disabled = true;
        retryBtn.style.opacity = '0.5';
        
        retryStatus.innerHTML = `
            <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #1976d2; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></span>
            Retrying chapter generation...
        `;
    }
    
    try {
        console.log('尝试单个章节重试...');
        
        const currentOutlineData = window.outlineData || outlineData;
        
        const response = await fetch('/api/generate/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'generate_single_chapter',
                outline: currentOutlineData,
                chapter_index: chapterIndex,
                topic: window.currentTopic || "",
                pos: window.getCurrentPos ? window.getCurrentPos() : 0
            })
        });

        console.log(`向后端传输的outlineData:`, currentOutlineData);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result && !result.error && result.content) {
            errorElement.remove();
            
            const chapterData = {
                index: chapterIndex,
                title: result.chapter_title || `Chapter ${chapterIndex + 1}`,
                content: result.content,
                references: result.references || {}
            };

            console.log(`章节 ${chapterIndex + 1} 生成成功:`, chapterData);
            
            if (window.saveChapterData && chapterData.references) {
                window.saveChapterData(chapterData);
            }
            
            window.createCollapsibleChapter(chapterData);
            
            showNotification(`Chapter ${chapterIndex + 1} generated successfully!`, 'success');
            
            const currentOutlineData = window.outlineData || outlineData;
            const chapters = currentOutlineData.split('\n').filter(line => line.trim().startsWith('#'));
            const hasRemainingChapters = chapterIndex + 1 < chapters.length;
            
            if (hasRemainingChapters) {
                if (typeof window.totalChapters === 'undefined') {
                    window.totalChapters = chapters.length;
                }
                if (typeof window.completedChaptersCount === 'undefined') {
                    window.completedChaptersCount = chapterIndex + 1;
                }
                
                showNotification(`Continuing with remaining chapters...`, 'info');
                setTimeout(() => {
                    if (window.continueGenerationFromChapter) {
                        window.continueGenerationFromChapter(chapterIndex + 1);
                    } else {
                        continueGenerationFromChapter(chapterIndex + 1);
                    }
                }, 1000);
            } else {
                if (window.displayArticleComplete) {
                    showNotification('All chapters generated successfully!', 'success');
                    window.displayArticleComplete([]);
                }
            }
        } else if (result && result.error) {
            if (retryStatus && retryBtn) {
                retryStatus.style.display = 'none';
                retryBtn.disabled = false;
                retryBtn.style.opacity = '1';
            }
            
            showNotification(`Chapter ${chapterIndex + 1} retry failed: ${result.error_message || 'Unknown error'}`, 'error');
        } else {
            throw new Error('Invalid response from server');
        }
        
    } catch (error) {
        console.error(`重试章节 ${chapterIndex + 1} 失败:`, error);
        
        if (retryStatus && retryBtn) {
            retryStatus.style.display = 'none';
            retryBtn.disabled = false;
            retryBtn.style.opacity = '1';
        }
        
        showNotification(`Chapter ${chapterIndex + 1} retry failed: ${error.message}`, 'error');
    }
}

// Export as global function
window.continueGenerationFromChapter = continueGenerationFromChapter;




