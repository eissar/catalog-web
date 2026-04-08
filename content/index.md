---
layout: default.njk
title: Catalog
---

<div style="text-align:center; padding:2rem 0;">
  <h2>Welcome to the Catalog</h2>
  <p>A collection of notes on philosophy, writing, tools, and more.</p>
  <p>Browse the catalog files:</p>
  <ul>
    {% for page in site.pages %}
      {% if page.url startsWith "/catalog/" %}
        <li><a href="{{ page.url }}">{{ page.inputPath.split('/')[-1] }}</a></li>
      {% endif %}
    {% endfor %}
  </ul>
</div>
