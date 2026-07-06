# Article Authoring Guide

This file is for editors and contributors. Keep this guide in the project repository, not inside client-delivered JS comments.

## Visibility Note

- Files inside the website runtime (HTML, CSS, JS) are visible to visitors through browser developer tools.
- Internal guides in project files like this .md are not shown in the page UI.
- If your repository is public, this file is still visible to anyone with repo access.

## How To Add A New Article

1. Open the category file under js/articles/.
2. Copy an existing article block from that same category.
3. Paste the new block in the same file inside window.BLOG_ARTICLES_PARTS.push(` ... `).
4. Update title, date, excerpt, author, and modal content.
5. Keep the category mapping correct:
   - data-category="<category>"
   - card visual class uses same category
   - post-category class uses same category

## Image-First Card Pattern

Use this visual block in each article card:

<div class="card-visual CATEGORY has-image" aria-hidden="true">
  <img
    class="card-image"
    src="images/CATEGORY/YOUR_IMAGE.jpg"
    alt="CATEGORY article cover"
    loading="lazy"
    onerror="this.style.display='none'; this.parentElement.classList.remove('has-image');"
  />
  <i class="fas fa-image"></i>
  <div class="card-badge">CATEGORY_LABEL</div>
  <div class="card-read-hint">Click to Read</div>
</div>

Replace:
- CATEGORY with news/events/service/etc.
- CATEGORY_LABEL with visible label text
- image path with your uploaded file

## Category Files

- js/articles/news.js
- js/articles/events.js
- js/articles/service.js
- js/articles/leadership.js
- js/articles/education.js
- js/articles/environment.js
- js/articles/health.js
- js/articles/technology.js
- js/articles/stories.js
- js/articles/achievements.js

## Recommended Image Folders

- images/news/
- images/events/
- images/service/
- images/leadership/
- images/education/
- images/environment/
- images/health/
- images/technology/
- images/stories/
- images/achievements/

## sample code 


<article class="blog-card reveal" data-category="education" data-date="2026-01-18">
          <div class="card-visual education" aria-hidden="true">
            <i class="fas fa-laptop-code"></i>
            <div class="card-badge">Education</div>
            <div class="card-read-hint">Click to Read</div>
          </div>
          <div class="card-body">
            <div class="post-meta">
              <span class="post-category education">Education</span>
              <span class="post-date"><i class="far fa-calendar-alt" aria-hidden="true"></i> January 18,
            </div>
            <h3 class="card-title">Digital Literacy Workshop: Teaching Seniors to Navigate the Digital W
            <p class="card-excerpt">
              Mrs. Lakshmi, 72, had never used a smartphone. By the end of our workshop,
              she was video calling her daughter in Australia for the first time.
              Their reactions were priceless.
            </p>
            <div class="card-footer">
              <div class="post-author-sm">
                <div class="author-avatar-sm gold" aria-hidden="true">P</div>
                <span>Punsara Dias</span>
              </div>
              <div class="card-info"><i class="far fa-clock" aria-hidden="true"></i> 4 min read</div>
            </div>
          </div>
          <template class="post-full-content">
            <h2>Digital Literacy Workshop: Bridging the Generation Gap</h2>
            <p class="content-meta">
              <i class="far fa-calendar-alt"></i> January 18, 2026 &nbsp;|&nbsp;
              <i class="far fa-clock"></i> 4 min read &nbsp;|&nbsp; By Punsara Dias
            </p>
            <p>
              Mrs. Lakshmi, 72, had never used a smartphone. By the end of our Digital Literacy
              Workshop, she was video calling her daughter in Australia for the first time in
              three years. She held the phone to her face and said, "I can see you. I can really
              see you." The room fell silent. Then everyone started crying.
            </p>
            <h3>Why This Matters</h3>
            <p>
              The digital divide is real. While younger generations navigate apps effortlessly,
              thousands of senior citizens and rural families are left behind — unable to access
              healthcare portals, government services, or even stay in touch with family abroad.
              Our workshop aimed to close that gap, one lesson at a time.
            </p>
            <h3>The Workshop</h3>
            <p>
              Over two Saturdays, 30 Leo volunteers conducted sessions at three community centres
              in Moratuwa. Topics included: how to use a smartphone safely, making video calls,
              accessing government e-services online, using Google Maps, and — critically —
              how to recognise and avoid online scams.
            </p>
            <blockquote>
              "I never thought I could learn these things at my age. But these young people were
              so patient and so kind. They never made me feel stupid for asking the same question
              five times."
              <br/><strong>— Workshop participant, age 68</strong>
            </blockquote>
            <h3>The Results</h3>
            <p>
              60 senior citizens completed the program. 48 said they felt noticeably more confident
              using their phones. Several formed their own WhatsApp group afterward — entirely
              organised by themselves. That, to us, was the real victory.
            </p>
            <div class="content-tags">
              <span class="tag">Digital Literacy</span>
              <span class="tag">Education</span>
              <span class="tag">Senior Citizens</span>
              <span class="tag">Community</span>
            </div>
          </template>
        </article>












































