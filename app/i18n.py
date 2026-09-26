"""Japanese and English browser editions with relative language navigation."""

# code, output folder, html lang, native name
EDITIONS = [
    ('ja', '', 'ja', '日本語'),
    ('en', 'en', 'en', 'English'),
]


def nav(code):
    here = dict((c, f) for c, f, _, _ in EDITIONS)[code]
    up = '../' if here else ''
    opts = []
    for c, folder, hl, name in EDITIONS:
        href = up + (folder + '/' if folder else '') + 'index.html'
        opts.append(f'<option value="{href}" lang="{hl}"{" selected" if c == code else ""}>{name}</option>')
    label = '言語' if code == 'ja' else 'Language'
    return (f'<label class="lang-switch"><span class="sr-only">{label}</span>'
            f'<select aria-label="{label}" onchange="if(this.value)location.href=this.value">' + ''.join(opts) + '</select></label>')
