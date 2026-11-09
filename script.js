// helper that loads a text document to an element
async function loadTextToElement(path, elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const text = await response.text();
    element.textContent = text.trim();
  } catch (error) {
    console.error(`Error loading text from ${path}:`, error);
    element.textContent = 'Failed to load content.';
  }
}

async function initTypewriter(path, targetElementId) {
  const targetElement = document.getElementById(targetElementId);
  if (!targetElement) return;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Failed to load typewriter words');
    const data = await response.text();
    const words = data.split(',').map(word => word.trim()).filter(word => word.length > 0);

    if (words.length === 0) return;

    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeEffect() {
      const currentWord = words[wordIndex];
      if (!currentWord) return;

      if (isDeleting) {
        // remove one character if deleting
        targetElement.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
      } else {
        // add one character if typing
        targetElement.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
      }

      // set timeout until next run
      let typingSpeed = isDeleting ? 30 : 50;

      if (!isDeleting && charIndex === currentWord.length) {
        // pause after finishing a word
        typingSpeed = 1000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        // pause before starting a new word
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        typingSpeed = 200;
      }

      // schedule next run
      setTimeout(typeEffect, typingSpeed);
    }

    typeEffect();
  } catch (error) {
    console.error('Error loading typewriter words:', error);
  }
}

async function loadProjects(path, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const listResponse = await fetch(path);
    if (!listResponse.ok) throw new Error('Failed to load project manifest');
    const projectList = await listResponse.json();

    const baseDir = path.substring(0, path.lastIndexOf('/') + 1);

    for (const project of projectList) {
      // get data for each project card
      const path = baseDir + project.file;
      const fileResponse = await fetch(path);
      if (!fileResponse.ok) continue;

      const text = await fileResponse.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      if (lines.length < 2) continue;

      // build cards from data
      const title = lines[0];
      const tags = lines[lines.length - 1].split(',').map(tag => tag.trim());
      const description = lines.slice(1, -1).join(' ');

      const card = document.createElement('a');
      card.className = 'work-card';
      card.href = project.url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';

      const tagsHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
      card.innerHTML = `
        <h3>${title}</h3>
        <p>${description}</p>
        <div class="tags">${tagsHtml}</div>
      `;

      // add card to the container
      container.appendChild(card);
    }
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

async function loadSkills(jsonPath, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const response = await fetch(jsonPath);
    if (!response.ok) throw new Error('Failed to load skills');
    const skills = await response.json();

    container.innerHTML = '';

    skills.forEach(skill => {
      const bubble = document.createElement('div');
      bubble.className = 'skill-bubble';
      bubble.title = skill.name;
      bubble.innerHTML = `<img src="${skill.icon}" alt="${skill.name}">`;
      container.appendChild(bubble);
    });
  } catch (error) {
    console.error('Error loading skills:', error);
  }
}

// initialize all dynamic elements
document.addEventListener('DOMContentLoaded', () => {
  loadTextToElement('public/text/about.txt', 'about-content');
  initTypewriter('public/text/ima.txt', 'typewriter-text');
  loadProjects('public/text/json/projects.json', 'projects-grid');
  loadSkills('public/text/json/skills.json', 'skills-grid', 'skills-lines');
});