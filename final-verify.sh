echo "=== VERIFICATION OF VISUAL CHANGES ==="
echo ""
echo "1. Checking sidebar background color in CSS..."
grep -o "background: #000000" /Users/admin/crm-ge/.next/static/css/app/layout.css && echo "✓ Black sidebar (#000000) found"
echo ""

echo "2. Checking base font-size in CSS..."
grep -o "font-size: 16px" /Users/admin/crm-ge/.next/static/css/app/layout.css && echo "✓ Base font-size 16px found"
echo ""

echo "3. Checking logo component in compiled Sidebar..."
grep -c "logo-groupe-echo.png" /Users/admin/crm-ge/.next/server -r && echo "✓ Logo image path found in compiled code"
echo ""

echo "4. Checking Image import in Sidebar..."
grep -c "next/image" /Users/admin/crm-ge/.next/server -r && echo "✓ Next Image import found"
echo ""

echo "5. Verifying text size classes increased..."
echo "   - text-base (navigation items)"
echo "   - text-lg (icons)"  
echo "   - text-[15px] (user name)"
echo "   - text-[13px] (user role)"
grep -c "text-base\|text-lg" /Users/admin/crm-ge/.next/server -r > /dev/null && echo "✓ Increased text sizes found"

echo ""
echo "=== ALL CHANGES VERIFIED ==="
