/**
 * Spike 005: Verify Spoonacular returns the fields the architecture depends on.
 * Checks: ingredients, nutrition, instructions, image_url.
 */

const API_KEY = process.env.SPOONACULAR_API_KEY;
if (!API_KEY) {
  console.error("Set SPOONACULAR_API_KEY env var");
  process.exit(1);
}

const MEAL_TITLE = "Chicken Stir Fry";

async function searchRecipe(query) {
  const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=1&apiKey=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`complexSearch HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getRecipeInfo(id) {
  const url = `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=true&apiKey=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`getRecipeInformation HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function check(label, value, required) {
  const present = value !== null && value !== undefined && value !== "" &&
    (Array.isArray(value) ? value.length > 0 : true);
  const marker = present ? "✓" : (required ? "✗ MISSING" : "○ absent");
  console.log(`  ${marker}  ${label}: ${Array.isArray(value) ? `[${value.length} items]` : JSON.stringify(value)?.slice(0, 80)}`);
  return present;
}

(async () => {
  console.log(`\nSpike 005: Spoonacular Recipe Shape\nQuery: "${MEAL_TITLE}"\n`);

  const search = await searchRecipe(MEAL_TITLE);
  const recipe = search.results?.[0];
  if (!recipe) { console.error("No results"); process.exit(1); }

  console.log(`Found: "${recipe.title}" (id: ${recipe.id})\n`);
  console.log("=== Full Recipe Information ===");

  const info = await getRecipeInfo(recipe.id);

  let allOk = true;

  console.log("\n--- Required for architecture ---");
  allOk &= check("title", info.title, true);
  allOk &= check("image (image_url)", info.image, true);
  allOk &= check("extendedIngredients (ingredients)", info.extendedIngredients, true);
  allOk &= check("nutrition.nutrients", info.nutrition?.nutrients, true);
  allOk &= check("analyzedInstructions (instructions)", info.analyzedInstructions, true);

  console.log("\n--- Ingredient shape (first item) ---");
  const ing = info.extendedIngredients?.[0];
  if (ing) {
    check("  name", ing.name, true);
    check("  amount", ing.amount, true);
    check("  unit", ing.unit, true);
    check("  original", ing.original, true);
  }

  console.log("\n--- Nutrition shape (first 3 nutrients) ---");
  info.nutrition?.nutrients?.slice(0, 3).forEach(n => {
    console.log(`    ${n.name}: ${n.amount} ${n.unit}`);
  });

  console.log("\n--- Instructions (first step) ---");
  const step = info.analyzedInstructions?.[0]?.steps?.[0];
  if (step) console.log(`    Step 1: ${step.step?.slice(0, 120)}`);

  console.log(`\n=== Verdict: ${allOk ? "VALIDATED ✓ — all required fields present" : "PARTIAL ⚠ — some fields missing"} ===`);
  console.log(`\nSpoonacular recipe id: ${recipe.id} — safe to cache as spoonacular_recipe_id`);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
