async function loadMarkdownToElement(path, elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const markdown = await response.text();
    const html = marked.parse(markdown.trim());
    element.innerHTML = DOMPurify.sanitize(html);
  } catch (error) {
    console.error(`Error loading markdown from ${path}:`, error);
    element.textContent = 'Failed to load content.';
  }
}
// initialize all dynamic elements
document.addEventListener('DOMContentLoaded', () => {
    loadMarkdownToElement('../public/text/projects/langlocked/about.md', 'about-content');
    loadMarkdownToElement('../public/text/projects/langlocked/techreport.md', 'tech-content');
    loadMarkdownToElement('../public/text/projects/langlocked/futurework.md', 'future-content');
});