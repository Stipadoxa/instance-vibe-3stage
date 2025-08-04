"""
Test case definitions for the UXPal automated testing system.
Each test case includes a user request prompt and success criteria for validation.
"""

TEST_REQUESTS = {
    "test1_login": {
        "name": "Simple Login Screen",
        "complexity": "beginner",
        "request": "Create a login screen for the marketplace app with email and password fields, a login button, and a 'forgot password' link.",
        "success_criteria": {
            "required_components": ["text-field", "button", "appbar"],
            "max_native_elements": 1,
            "required_variants": ["text-field variants for email/password"],
            "layout_structure": "vertical"
        }
    },
    "test2_settings": {
        "name": "Notification Settings",
        "complexity": "intermediate",
        "request": "Design a notification settings page where users can toggle different types of notifications on/off (push notifications, email alerts, SMS updates, promotional offers) with toggle switches and descriptive text for each option.",
        "success_criteria": {
            "required_components": ["list-item", "appbar"],
            "max_native_elements": 2,
            "required_variants": ["list-item with trailing elements"],
            "context_requirements": ["settings icons", "proper variant usage"]
        }
    },
    "test3_product_listing": {
        "name": "Product Search Results",
        "complexity": "intermediate-advanced",
        "request": "Create a product listing page showing search results for electronics, with a search bar at the top, filter button, and a grid of product cards displaying product images, titles, prices, and seller ratings.",
        "success_criteria": {
            "required_components": ["product card", "search-field", "button"],
            "max_native_elements": 3,
            "layout_requirements": ["grid layout handling"],
            "component_combinations": ["search + cards"]
        }
    },
    "test4_product_detail": {
        "name": "Product Detail Page",
        "complexity": "advanced",
        "request": "Design a product detail page for a used laptop listing, showing multiple product photos, title, price, condition details, seller profile with rating, description, and contact seller button.",
        "success_criteria": {
            "required_components": ["appbar", "button", "image"],
            "max_native_elements": 4,
            "context_requirements": ["bookmark icon swap", "visibility overrides"],
            "information_hierarchy": ["multiple text levels"]
        }
    },
    "test5_seller_dashboard": {
        "name": "Seller Dashboard",
        "complexity": "expert",
        "request": "Create a seller dashboard homepage with quick stats cards (total listings, views this week, messages), recent activity feed, and action buttons to create new listing or view all messages, plus bottom navigation.",
        "success_criteria": {
            "required_components": ["card", "button", "bottom navigation"],
            "max_native_elements": 5,
            "complex_requirements": ["dashboard statistics", "multiple card types"],
            "navigation_context": ["dashboard-specific adaptations"]
        }
    }
}