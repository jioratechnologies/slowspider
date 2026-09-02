import 'package:flutter/material.dart';

import '../design/typography.dart';
import '../core/app_theme.dart';

/// Formats and renders mathematical LaTeX expressions and rich markdown text.
class RenderedMathText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final Color? mathColor;
  final bool selectable;

  const RenderedMathText({
    super.key,
    required this.text,
    this.style,
    this.mathColor,
    this.selectable = false,
  });

  static const Map<String, String> _latexToUnicode = {
    r'\hbar': 'ħ',
    r'\nabla': '∇',
    r'\partial': '∂',
    r'\int': '∫',
    r'\iint': '∬',
    r'\iiint': '∭',
    r'\oint': '∮',
    r'\sum': '∑',
    r'\prod': '∏',
    r'\sqrt': '√',
    r'\hat{H}': 'Ĥ',
    r'\hat{p}': 'p̂',
    r'\hat{x}': 'x̂',
    r'|\psi\rangle': '|ψ⟩',
    r'\langle\psi|': '⟨ψ|',
    r'\langle\psi|\hat{H}|\psi\rangle': '⟨ψ|Ĥ|ψ⟩',
    r'|\phi\rangle': '|ϕ⟩',
    r'\langle\phi|': '⟨ϕ|',
    r'\alpha': 'α',
    r'\beta': 'β',
    r'\gamma': 'γ',
    r'\delta': 'δ',
    r'\epsilon': 'ε',
    r'\theta': 'θ',
    r'\lambda': 'λ',
    r'\mu': 'μ',
    r'\pi': 'π',
    r'\rho': 'ρ',
    r'\sigma': 'σ',
    r'\tau': 'τ',
    r'\phi': 'ϕ',
    r'\psi': 'ψ',
    r'\omega': 'ω',
    r'\Gamma': 'Γ',
    r'\Delta': 'Δ',
    r'\Theta': 'Θ',
    r'\Lambda': 'Λ',
    r'\Sigma': 'Σ',
    r'\Phi': 'Φ',
    r'\Psi': 'Ψ',
    r'\Omega': 'Ω',
    r'\infty': '∞',
    r'\pm': '±',
    r'\mp': '∓',
    r'\times': '×',
    r'\cdot': '·',
    r'\div': '÷',
    r'\neq': '≠',
    r'\leq': '≤',
    r'\geq': '≥',
    r'\approx': '≈',
    r'\propto': '∝',
    r'\in': '∈',
    r'\notin': '∉',
    r'\subset': '⊂',
    r'\supset': '⊃',
    r'\cup': '∪',
    r'\cap': '∩',
    r'\forall': '∀',
    r'\exists': '∃',
    r'\to': '→',
    r'\rightarrow': '→',
    r'\leftarrow': '←',
    r'\Rightarrow': '⇒',
    r'\Leftrightarrow': '⇔',
  };

  static const Map<String, String> _superscripts = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '⁺',
    '-': '⁻',
    '=': '⁼',
    '(': '⁽',
    ')': '⁾',
    'n': 'ⁿ',
    'i': 'ⁱ',
    'x': 'ˣ',
    'y': 'ʸ',
  };

  static const Map<String, String> _subscripts = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
    '+': '₊',
    '-': '₋',
    '=': '₌',
    '(': '₍',
    ')': '₎',
    'a': 'ₐ',
    'e': 'ₑ',
    'h': 'ₕ',
    'i': 'ᵢ',
    'j': 'ⱼ',
    'k': 'ₖ',
    'l': 'ₗ',
    'm': 'ₘ',
    'n': 'ₙ',
    'o': 'ₒ',
    'p': 'ₚ',
    'r': 'ᵣ',
    's': 'ₛ',
    't': 'ₜ',
    'u': 'ᵤ',
    'v': 'ᵥ',
    'x': 'ₓ',
  };

  static String renderMathString(String input) {
    var output = input;

    // 1. Replace fractions \frac{a}{b} -> (a / b)
    output = output.replaceAllMapped(RegExp(r'\\frac\{([^}]+)\}\{([^}]+)\}'), (
      m,
    ) {
      return '(${m[1]} / ${m[2]})';
    });

    // 2. Replace square roots \sqrt{a} -> √(a)
    output = output.replaceAllMapped(RegExp(r'\\sqrt\{([^}]+)\}'), (m) {
      return '√(${m[1]})';
    });

    // 3. Replace superscripts e^{...} or x^2
    output = output.replaceAllMapped(RegExp(r'\^\{([^}]+)\}'), (m) {
      return _toSuperscript(m[1] ?? '');
    });
    output = output.replaceAllMapped(RegExp(r'\^([0-9a-zA-Z+-])'), (m) {
      return _toSuperscript(m[1] ?? '');
    });

    // 4. Replace subscripts x_{...} or x_1
    output = output.replaceAllMapped(RegExp(r'_\{([^}]+)\}'), (m) {
      return _toSubscript(m[1] ?? '');
    });
    output = output.replaceAllMapped(RegExp(r'_([0-9a-zA-Z+-])'), (m) {
      return _toSubscript(m[1] ?? '');
    });

    // 5. Replace macros
    for (final entry in _latexToUnicode.entries) {
      output = output.replaceAll(entry.key, entry.value);
    }

    // 6. Remove remaining dollar signs
    output = output.replaceAll(r'$$', ' ').replaceAll(r'$', '');

    return output;
  }

  static String _toSuperscript(String str) {
    return str.split('').map((char) => _superscripts[char] ?? char).join();
  }

  static String _toSubscript(String str) {
    return str.split('').map((char) => _subscripts[char] ?? char).join();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final defaultColor = style?.color ?? theme.colorScheme.onSurface;
    final accentMath = mathColor ?? (isDark ? AppColors.ink : AppColors.ink);

    final baseStyle =
        style ?? AppType.sans(fontSize: 13.5, color: defaultColor, height: 1.4);

    // Parse $$ ... $$ and $ ... $ tokens
    final spans = <InlineSpan>[];
    final regex = RegExp(r'(\$\$.*?\$\$|\$.*?\$)', dotAll: true);

    int lastIndex = 0;
    for (final match in regex.allMatches(text)) {
      if (match.start > lastIndex) {
        spans.add(
          TextSpan(
            text: text.substring(lastIndex, match.start),
            style: baseStyle,
          ),
        );
      }

      final rawMath = match.group(0)!;
      final rendered = renderMathString(rawMath);

      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
            margin: const EdgeInsets.symmetric(horizontal: 1.5),
            decoration: BoxDecoration(
              color: accentMath.withValues(alpha: isDark ? 0.16 : 0.1),
              borderRadius: BorderRadius.circular(5),
            ),
            child: Text(
              rendered,
              style: AppType.serif(
                color: accentMath,
                fontSize: (baseStyle.fontSize ?? 13.5) * 1.05,
                fontWeight: FontWeight.w600,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ),
      );

      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      spans.add(TextSpan(text: text.substring(lastIndex), style: baseStyle));
    }

    if (spans.isEmpty) {
      spans.add(TextSpan(text: text, style: baseStyle));
    }

    if (selectable) {
      return SelectableText.rich(TextSpan(children: spans), style: baseStyle);
    }

    return RichText(text: TextSpan(children: spans));
  }
}
