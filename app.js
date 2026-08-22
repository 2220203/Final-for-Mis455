"use strict";

const API_URL = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
const INITIAL_RESULT_LIMIT = 5;

const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#meal-query");
const mealGrid = document.querySelector("#meal-grid");
const status = document.querySelector("#status");
const resultCount = document.querySelector("#result-count");
const resultsSection = document.querySelector("#results-section");
const resultsTitle = document.querySelector("#results-title");
const showAllButton = document.querySelector("#show-all");
const quickSearchButtons = document.querySelectorAll(".quick-search");

let allMeals = [];
let currentQuery = "";
let activeRequestController = null;

function clearResults() {
  allMeals = [];
  mealGrid.replaceChildren();
  status.replaceChildren();
  resultCount.textContent = "";
  showAllButton.hidden = true;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function createLoadingCard() {
  const card = createElement("div", "skeleton-card");
  card.setAttribute("aria-hidden", "true");

  const image = createElement("div", "skeleton-image");
  const content = createElement("div", "skeleton-content");

  content.append(
    createElement("div", "skeleton-line short"),
    createElement("div", "skeleton-line title"),
    createElement("div", "skeleton-line"),
    createElement("div", "skeleton-line"),
    createElement("div", "skeleton-line short"),
  );
  card.append(image, content);

  return card;
}

function showLoading() {
  status.textContent = `Searching for ${currentQuery} meals…`;
  status.className = "sr-only";

  const loadingGrid = createElement("div", "loading-grid");
  loadingGrid.setAttribute("aria-label", "Loading meals");

  for (let index = 0; index < 3; index += 1) {
    loadingGrid.append(createLoadingCard());
  }

  mealGrid.append(loadingGrid);
}

function createMessageState(type, title, message) {
  const wrapper = createElement("div", `${type}-state`);
  const icon = createElement("span", type === "error" ? "error-icon" : "empty-icon", type === "error" ? "!" : "✦");
  icon.setAttribute("aria-hidden", "true");
  const heading = createElement("h3", "", title);
  const description = createElement("p", "", message);

  wrapper.append(icon, heading, description);
  return wrapper;
}

function showNoResults() {
  status.className = "status";
  status.replaceChildren(
    createMessageState(
      "empty",
      "No meals found",
      `We could not find a meal matching “${currentQuery}”. Try another name or ingredient.`,
    ),
  );
  resultCount.textContent = "0 meals found";
}

function showError() {
  status.className = "status";
  const errorState = createMessageState(
    "error",
    "Something went wrong",
    "We could not reach TheMealDB. Check your connection and try again.",
  );
  const retryButton = createElement("button", "retry-button", "Try again");
  retryButton.type = "button";
  retryButton.addEventListener("click", () => searchMeals(currentQuery));
  errorState.append(retryButton);
  status.replaceChildren(errorState);
}

function createMealCard(meal, index) {
  const card = createElement("article", "meal-card");
  card.style.animationDelay = `${Math.min(index * 55, 330)}ms`;

  const imageWrap = createElement("div", "meal-image-wrap");
  const image = createElement("img", "meal-image");
  image.src = meal.strMealThumb;
  image.alt = meal.strMeal ? `${meal.strMeal} meal` : "Meal photograph";
  image.loading = index < INITIAL_RESULT_LIMIT ? "eager" : "lazy";
  image.decoding = "async";

  const id = createElement("p", "meal-id", `Meal ID · ${meal.idMeal || "N/A"}`);
  imageWrap.append(image, id);

  const content = createElement("div", "meal-content");
  const meta = createElement("div", "meal-meta");

  if (meal.strCategory) {
    meta.append(createElement("span", "", meal.strCategory));
  }

  if (meal.strArea) {
    meta.append(createElement("span", "", meal.strArea));
  }

  const title = createElement("h3", "", meal.strMeal || "Untitled meal");
  const mealName = createElement("p", "meal-name");
  const nameLabel = createElement("strong", "", "Meal name: ");
  mealName.append(nameLabel, document.createTextNode(meal.strMeal || "Untitled meal"));

  const instructionLabel = createElement("p", "instruction-label", "Cooking instructions");
  const instructions = createElement(
    "p",
    "instructions",
    meal.strInstructions?.trim() || "Cooking instructions are not available for this meal.",
  );

  content.append(meta, title, mealName, instructionLabel, instructions);
  card.append(imageWrap, content);

  return card;
}

function renderMeals(meals) {
  mealGrid.replaceChildren();
  status.replaceChildren();
  status.className = "status";

  const fragment = document.createDocumentFragment();
  meals.forEach((meal, index) => fragment.append(createMealCard(meal, index)));
  mealGrid.append(fragment);
}

function displayInitialResults() {
  const visibleMeals = allMeals.slice(0, INITIAL_RESULT_LIMIT);
  renderMeals(visibleMeals);

  const mealLabel = allMeals.length === 1 ? "meal" : "meals";
  resultCount.textContent = `${allMeals.length} ${mealLabel} found for “${currentQuery}”`;
  showAllButton.hidden = allMeals.length <= INITIAL_RESULT_LIMIT;

  if (!showAllButton.hidden) {
    const remaining = allMeals.length - INITIAL_RESULT_LIMIT;
    showAllButton.textContent = `Show all · ${remaining} more`;
  }
}

async function searchMeals(query) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    searchInput.focus();
    return;
  }

  if (activeRequestController) {
    activeRequestController.abort();
  }

  activeRequestController = new AbortController();
  currentQuery = normalizedQuery;
  clearResults();
  showLoading();

  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const response = await fetch(`${API_URL}${encodeURIComponent(normalizedQuery)}`, {
      signal: activeRequestController.signal,
    });

    if (!response.ok) {
      throw new Error(`TheMealDB returned ${response.status}`);
    }

    const data = await response.json();
    mealGrid.replaceChildren();
    allMeals = Array.isArray(data.meals) ? data.meals : [];

    if (allMeals.length === 0) {
      showNoResults();
      return;
    }

    displayInitialResults();
    resultsTitle.setAttribute("tabindex", "-1");
    resultsTitle.focus({ preventScroll: true });
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    mealGrid.replaceChildren();
    showError();
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchMeals(searchInput.value);
});

quickSearchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.query;
    searchMeals(button.dataset.query);
  });
});

showAllButton.addEventListener("click", () => {
  renderMeals(allMeals);
  showAllButton.hidden = true;
  resultCount.textContent = `Showing all ${allMeals.length} meals for “${currentQuery}”`;

  const firstNewCard = mealGrid.children[INITIAL_RESULT_LIMIT];
  if (firstNewCard) {
    firstNewCard.setAttribute("tabindex", "-1");
    firstNewCard.focus({ preventScroll: true });
  }
});
