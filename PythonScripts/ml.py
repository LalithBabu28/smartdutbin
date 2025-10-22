from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor

# Load dataset
df = pd.read_csv("Updated_Sorted_Waste_Dataset.csv")

# Rename columns for consistency
df.rename(columns={
    'Meal Type': 'Meal_Category',
    'Food Item': 'Dish_Name',
    'Wasted (kg)': 'Waste_kg',
    'Consumed (kg)': 'Consumed_kg',
    'Prepared (kg)': 'Prepared_kg',
    'Number of Students': 'Student_Count',
    'Holiday or Weekday': 'Day_Type',
    '1kg Cost (Min)': 'Cost_Min',
    '1kg Cost (Max)': 'Cost_Max'
}, inplace=True)

# Encode categorical variables
label_encoders = {}
categorical_cols = ['Season', 'Day_Type', 'Day', 'Meal_Category', 'Dish_Name']
for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    label_encoders[col] = le

# Select features and target variable
features = ['Season', 'Day_Type', 'Day', 'Meal_Category', 'Student_Count', 'Prepared_kg']
target = 'Waste_kg'

X = df[features]
y = df[target]

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Random Forest Regressor model
rf = RandomForestRegressor(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)

# Function to predict waste and calculate total cost
def predict_waste_and_cost(season, day_type, day, meal_category, students):
    try:
        # Log the input parameters
        print("predict_waste_and_cost called with parameters:")
        print(f"season: {season}, day_type: {day_type}, day: {day}, meal_category: {meal_category}, students: {students}")

        # Encode inputs and log the encoded values
        print("Encoding input parameters...")
        season_encoded = label_encoders['Season'].transform([season])[0]
        day_type_encoded = label_encoders['Day_Type'].transform([day_type])[0]
        day_encoded = label_encoders['Day'].transform([day])[0]
        meal_category_encoded = label_encoders['Meal_Category'].transform([meal_category])[0]
        print(f"Encoded values - season: {season_encoded}, day_type: {day_type_encoded}, day: {day_encoded}, meal_category: {meal_category_encoded}")

        # Filter dataset and log the result
        print("Filtering dataset based on encoded parameters...")
        food_items_df = df[(df['Season'] == season_encoded) &
                           (df['Day_Type'] == day_type_encoded) &
                           (df['Day'] == day_encoded) &
                           (df['Meal_Category'] == meal_category_encoded)]
        print(f"Filtered DataFrame size: {len(food_items_df)} rows")

        # Check if the DataFrame is empty
        if food_items_df.empty:
            print("No data found for the given parameters.")
            return {"error": "No data found for the given parameters."}

        # Get unique dishes and their names
        print("Extracting unique dishes and names...")
        unique_dishes = food_items_df['Dish_Name'].unique()
        dish_names = [label_encoders['Dish_Name'].inverse_transform([dish])[0] for dish in unique_dishes]
        print(f"Unique dishes: {unique_dishes}")
        print(f"Dish names: {dish_names}")

        # Calculate quantities and costs
        print("Calculating average quantities and costs...")
        quantities = food_items_df.groupby('Dish_Name')['Prepared_kg'].mean().to_dict()
        cost_min = food_items_df.groupby('Dish_Name')['Cost_Min'].mean().to_dict()
        cost_max = food_items_df.groupby('Dish_Name')['Cost_Max'].mean().to_dict()
        print(f"Quantities: {quantities}")
        print(f"Cost Min: {cost_min}")
        print(f"Cost Max: {cost_max}")

        predictions = {}
        total_min_cost = 0
        total_max_cost = 0

        # Predict waste and calculate costs for each dish
        print("Predicting waste and calculating costs for each dish...")
        for dish_type, dish_name in zip(unique_dishes, dish_names):
            qty = quantities.get(dish_type, 0)
            cost_min_per_kg = cost_min.get(dish_type, 0)
            cost_max_per_kg = cost_max.get(dish_type, 0)
            print(f"Processing dish: {dish_name} (type: {dish_type})")
            print(f"Prepared quantity: {qty}, Cost Min per kg: {cost_min_per_kg}, Cost Max per kg: {cost_max_per_kg}")

            input_data = pd.DataFrame({
                'Season': [season_encoded],
                'Day_Type': [day_type_encoded],
                'Day': [day_encoded],
                'Meal_Category': [meal_category_encoded],
                'Student_Count': [students],
                'Prepared_kg': [qty]
            })
            print(f"Input data for prediction: {input_data.to_dict()}")

            pred = rf.predict(input_data)[0]
            predictions[dish_name] = pred
            print(f"Predicted waste for {dish_name}: {pred}")

            # Calculate cost for the dish
            min_cost = qty * cost_min_per_kg
            max_cost = qty * cost_max_per_kg
            total_min_cost += min_cost
            total_max_cost += max_cost
            print(f"Cost for {dish_name} - Min: {min_cost}, Max: {max_cost}")

        # Calculate totals
        total_waste = np.sum(list(predictions.values()))
        total_prepared = np.sum(list(quantities.values()))
        print(f"Total predicted waste: {total_waste}")
        print(f"Total prepared quantity: {total_prepared}")
        print(f"Total Min Cost: {total_min_cost}, Total Max Cost: {total_max_cost}")

        # Prepare and return the result
        result = {
            "predictions": predictions,
            "total_waste": float(total_waste),
            "total_prepared": float(total_prepared),
            "total_min_cost": float(total_min_cost),
            "total_max_cost": float(total_max_cost)
        }
        print("Prediction completed successfully. Result:", result)
        return result

    except Exception as e:
        print(f"Error occurred in predict_waste_and_cost: {str(e)}")
        return {"error": str(e)}
# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Define the predict endpoint
@app.route('/predict', methods=['POST'])
def predict():
    # Log the incoming request data
    print("Received request at /predict endpoint")
    data = request.get_json()
    print("Raw request data:", data)

    # Extract and log parameters
    season = data.get('season')
    day_type = data.get('day_type')
    day = data.get('day')
    meal_category = data.get('meal_category')
    students = data.get('students')
    print(f"Extracted parameters - season: {season}, day_type: {day_type}, day: {day}, meal_category: {meal_category}, students: {students}")

    # Check for missing parameters
    if not all([season, day_type, day, meal_category, students]):
        print("Validation failed: Missing parameters")
        return jsonify({"error": "All parameters are required."}), 400
    print("All parameters are present")

    # Validate and convert students to integer
    try:
        students = int(students)
        print(f"Successfully converted students to integer: {students}")
    except ValueError:
        print("Validation failed: Students is not an integer")
        return jsonify({"error": "Students must be an integer."}), 400

    # Call the prediction function and log the result
    print("Calling predict_waste_and_cost with parameters")
    result = predict_waste_and_cost(season, day_type, day, meal_category, students)
    print("Result from predict_waste_and_cost:", result)

    # Check for errors in the result
    if "error" in result:
        print("Prediction failed with error:", result["error"])
        return jsonify(result), 400

    print("Prediction successful, returning result")
    return jsonify(result)

# Run the Flask app on port 5001
if __name__ == "__main__":
    app.run(port=5001)