import { Vector2 } from "../utils/Vector2";
import { randomColor } from "../utils/MathUtils";

let foodId = 0;

export class FoodItem {
  id: string;
  position: Vector2;
  nutrition: number;
  color: string;
  radius: number;
  isAlive: boolean = true;

  constructor(position: Vector2, nutrition: number = 1) {
    this.id = `food_${foodId++}`;
    this.position = position;
    this.nutrition = nutrition;
    this.color = randomColor();
    this.radius = nutrition > 1 ? 8 : 4;
  }
}
