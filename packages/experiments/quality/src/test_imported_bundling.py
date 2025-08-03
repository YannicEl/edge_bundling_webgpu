#!/usr/bin/env python3
"""
Test script for ImportedBundling class.
"""

import sys
import os

# Add the current directory to the path so we can import the modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from importedBundling import ImportedBundling

def test_imported_bundling():
    """Test the ImportedBundling class with the test bundling file."""
    
    # Path to the test bundling file
    bundling_file = "test/bundling.json"
    
    try:
        # Create an ImportedBundling instance
        print("Loading bundled graph from:", bundling_file)
        imported_bundling = ImportedBundling(bundling_file)
        
        # Check that the graph was loaded correctly
        print(f"Graph loaded successfully!")
        print(f"Number of nodes: {imported_bundling.G.number_of_nodes()}")
        print(f"Number of edges: {imported_bundling.G.number_of_edges()}")
        
        # Check that some edges have splines
        edges_with_splines = 0
        for u, v, data in imported_bundling.G.edges(data=True):
            if 'Spline' in data:
                edges_with_splines += 1
        
        print(f"Edges with splines: {edges_with_splines}")
        
        # Test drawing
        print("Testing drawing...")
        imported_bundling.draw("test/imported_bundling_test", color=True, plotIpe=False)
        print("Drawing completed! Check test/imported_bundling_test.png")
        
        return True
        
    except Exception as e:
        print(f"Error testing ImportedBundling: {e}")
        return False

if __name__ == "__main__":
    success = test_imported_bundling()
    if success:
        print("✅ ImportedBundling test passed!")
    else:
        print("❌ ImportedBundling test failed!")
        sys.exit(1) 