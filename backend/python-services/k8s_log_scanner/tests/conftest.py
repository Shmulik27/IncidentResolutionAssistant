import os
import sys

# Add the parent directory (python-services) to Python path so that 'common' module can be imported
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, parent_dir)

# Add the current directory to Python path so that 'app' module can be imported
current_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
