# TDEE Calculator

A clean, mobile-friendly TDEE calculator built with plain HTML, CSS, and vanilla JavaScript.

This project estimates daily calorie needs using widely known formulas, gives a simple breakdown of energy expenditure, and helps users set a maintenance, weight loss, or weight gain calorie target.

## Overview

The goal of this project is to provide a lightweight nutrition calculator that is:

- easy to understand
- fast to load
- responsive on mobile
- simple to embed into a personal website
- straightforward to fork and customize

## Features

- BMR estimates with Mifflin-St Jeor and Harris-Benedict
- TDEE estimate built from BMR, daily movement, training, and steps
- Goal modes for maintenance, weight loss, and weight gain
- Adjustable target weight change and daily calorie adjustment
- Formula selection for the final calorie target
- Responsive interface designed for desktop and mobile
- No framework, no dependencies, no build step

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript

## Project Structure

```text
.
├── index.html
├── style.css
├── script.js
├── README.md
├── LICENSE
└── .gitignore
```

## How It Works

The calculator combines:

- a BMR formula
- a fixed base movement estimate
- training energy expenditure
- walking energy expenditure estimated from daily steps and body weight

Users can then:

- keep calories at maintenance
- apply a deficit for fat loss
- apply a surplus for weight gain

The goal section also provides a simple timeline estimate based on the selected calorie adjustment and target weight change.

## Running Locally

No installation is required.

1. Clone or download the repository.
2. Open `index.html` in your browser.

If you prefer, you can also serve the folder with any static server.

## Customization

This project is intentionally simple, so it is easy to adapt.

Common changes include:

- adjusting the visual style in `style.css`
- changing the copy in `index.html`
- fine-tuning the formulas and assumptions in `script.js`
- embedding the calculator into an existing personal website

## Notes

- This calculator is designed for educational and personal-use scenarios.
- Results are estimates, not medical advice.
- Real-world calorie needs vary by individual, habits, and health context.

## License

This project is released under the MIT License.

You are free to use, modify, publish, and distribute it.
