#!/usr/bin/env python3
"""
Simple test for ImportedBundling class.
"""

import sys
import os

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from importedBundling import ImportedBundling
    print("✅ Successfully imported ImportedBundling")
    
    # Test with the existing bundling file
    bundling_file = "test/bundling.json"
    
    if os.path.exists(bundling_file):
        print(f"✅ Found bundling file: {bundling_file}")
        
        # Create ImportedBundling instance
        imported = ImportedBundling(bundling_file)
        print(f"✅ Created ImportedBundling instance")
        print(f"   Nodes: {imported.G.number_of_nodes()}")
        print(f"   Edges: {imported.G.number_of_edges()}")
        
        # Count edges with splines
        spline_count = sum(1 for u, v, data in imported.G.edges(data=True) if 'Spline' in data)
        print(f"   Edges with splines: {spline_count}")
        
        print("✅ Test completed successfully!")
        
    else:
        print(f"❌ Bundling file not found: {bundling_file}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc() 