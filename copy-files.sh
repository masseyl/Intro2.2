#!/bin/bash

# Default output file
OUTPUT_FILE="combined.js"

# Default exclusions
EXCLUSIONS=(
    "node_modules"
    "dist"
    "build"
    ".git"
    "test"
    "coverage"
    "dnu"
    ".next"
)

# Default search directories (current directory)
SEARCH_DIRECTORIES=("./")

# Function to print usage
print_usage() {
    echo "Usage: $0 [-o output_file] [-e \"excluded_pattern1 excluded_pattern2 ...\"] [-d \"dir1 dir2 ...\"]"
    echo "  -o: Specify output file (default: combined.js)"
    echo "  -e: Space-separated list of additional exclusion patterns"
    echo "  -d: Space-separated list of directories to search (default: current directory)"
    echo "  -h: Show this help message"
}

# Process command line arguments
while getopts "o:e:d:h" opt; do
    case $opt in
        o)
            OUTPUT_FILE="$OPTARG"
            ;;
        e)
            IFS=' ' read -r -a additional_exclusions <<< "$OPTARG"
            EXCLUSIONS+=("${additional_exclusions[@]}")
            ;;
        d)
            IFS=' ' read -r -a SEARCH_DIRECTORIES <<< "$OPTARG"
            ;;
        h)
            print_usage
            exit 0
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            print_usage
            exit 1
            ;;
    esac
done

# Create or clear the output file
> "$OUTPUT_FILE"

# Build find command with exclusions and file types
FIND_CMD="find ${SEARCH_DIRECTORIES[*]} -type f \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.css' \)"
for exclusion in "${EXCLUSIONS[@]}"; do
    FIND_CMD="$FIND_CMD -not -path '*/$exclusion/*' -not -path '*/$exclusion'"
done

# Function to add file separator comments
add_file_separator() {
    local file=$1
    echo -e "\n\n// ==============================================" >> "$OUTPUT_FILE"
    echo "// Source: $file" >> "$OUTPUT_FILE"
    echo -e "// ==============================================\n" >> "$OUTPUT_FILE"
}

# Counter for processed files
total_files=0
processed_files=0

# Count total files
total_files=$(eval "$FIND_CMD" | wc -l)

echo "Starting to combine TypeScript and JavaScript files..."
echo "Excluded patterns: ${EXCLUSIONS[*]}"
echo "Search directories: ${SEARCH_DIRECTORIES[*]}"
echo "Output file: $OUTPUT_FILE"
echo "Found $total_files files to process"

# Process each file
while IFS= read -r file; do
    if [ -f "$file" ]; then
        if [ "$(basename "$file")" = "$OUTPUT_FILE" ]; then
            continue
        fi

        ((processed_files++))
        echo "Processing ($processed_files/$total_files): $file"
        
        # Add file separator and contents to output file
        add_file_separator "$file"
        cat "$file" >> "$OUTPUT_FILE"
    fi
done < <(eval "$FIND_CMD" | sort)

# Final statistics
echo -e "\nProcessing complete!"
echo "Total files processed: $processed_files"
echo "Output saved to: $OUTPUT_FILE"
echo "Output file size: $(wc -c < "$OUTPUT_FILE" | numfmt --to=iec-i --suffix=B --padding=7)"

# Verify the output file exists and has content
if [ -s "$OUTPUT_FILE" ]; then
    echo "Combined file created successfully!"
else
    echo "Warning: Output file is empty or was not created properly."
    exit 1
fi
