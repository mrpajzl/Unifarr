# TrueCharts Submission Guide

Jak přidat Unifarr do TrueCharts katalogu.

## Proč TrueCharts?

- **60,000+ aktivních uživatelů**
- **Automatické updates**
- **Viditelnost v TrueNAS UI**
- **Komunitní podpora**
- **CI/CD testing**

## Příprava

### 1. Co už máme ✅

- [x] Helm chart (`charts/unifarr/`)
- [x] `questions.yaml` pro TrueNAS UI
- [x] Docker images (public na GHCR)
- [x] Dokumentace
- [x] Icon
- [x] GitHub repo

### 2. Co potřebujeme pro TrueCharts

TrueCharts má specifické požadavky:

```
charts/stable/unifarr/
├── Chart.yaml          # ✅ už máme
├── values.yaml         # ✅ už máme  
├── questions.yaml      # ✅ už máme
├── app-readme.md       # vytvoříme
├── icon.png            # konvertujeme z SVG
├── item.yaml           # metadata
├── ix_values.yaml      # ✅ už máme
└── templates/          # ✅ už máme
    ├── deployment.yaml
    ├── service.yaml
    └── ...
```

## Postup přidání

### Krok 1: Fork TrueCharts

```bash
# Přejdi na GitHub
https://github.com/truecharts/charts

# Klikni Fork
# Naklonuj fork
git clone https://github.com/mrpajzl/charts.git truecharts-charts
cd truecharts-charts
```

### Krok 2: Vytvoř branch

```bash
git checkout -b add-unifarr
```

### Krok 3: Přidej Unifarr chart

```bash
# Zkopíruj náš chart
mkdir -p charts/stable/unifarr
cp -r /path/to/unifarr/charts/unifarr/* charts/stable/unifarr/

# Přidej item.yaml (metadata pro katalog)
cat > charts/stable/unifarr/item.yaml <<EOF
categories:
  - media
icon_url: https://raw.githubusercontent.com/mrpajzl/Unifarr/main/icon.svg
EOF

# Přidej app-readme.md (krátký popis)
cat > charts/stable/unifarr/app-readme.md <<EOF
# Unifarr

Unified media management for movies and TV shows.

**Key Features:**
- Movie & TV show library management
- Episode monitoring with auto-download
- Multi-source search (torrents, Webshare)
- Smart file matching
- Template-based search
- Beautiful web UI

**Homepage:** https://github.com/mrpajzl/Unifarr
EOF
```

### Krok 4: Test lokálně

```bash
# Install helm-docs
brew install norwoodj/tap/helm-docs

# Generate docs
cd charts/stable/unifarr
helm-docs

# Lint
helm lint .

# Test install
helm install unifarr-test . --dry-run --debug
```

### Krok 5: Commit & Push

```bash
git add charts/stable/unifarr
git commit -m "feat(unifarr): Add Unifarr media management app

Unifarr is a unified media manager for movies and TV shows with:
- TMDB metadata matching
- Episode monitoring
- Auto-download support
- Multi-source search
- Template-based search per show

More info: https://github.com/mrpajzl/Unifarr"

git push origin add-unifarr
```

### Krok 6: Create Pull Request

1. Jdi na https://github.com/mrpajzl/charts
2. Klikni "Compare & pull request"
3. Title: `feat(unifarr): Add Unifarr media management app`
4. Description:
   ```markdown
   ## Description
   
   Adds Unifarr - a unified media manager for movies and TV shows.
   
   ## Features
   - Movie & TV show library management
   - Episode monitoring with auto-download
   - Multi-source torrent search
   - Smart diacritics-aware matching
   - Template-based search customization
   - Modern web UI
   
   ## Testing
   - [x] Helm lint passed
   - [x] Dry-run successful
   - [x] Deployed and tested on TrueNAS SCALE
   - [x] Docker images public on GHCR
   
   ## Screenshots
   [Attach screenshots of web UI]
   
   ## Links
   - GitHub: https://github.com/mrpajzl/Unifarr
   - Documentation: https://github.com/mrpajzl/Unifarr/blob/main/README.md
   ```

5. Submit PR

### Krok 7: Čekej na review

TrueCharts maintainers review (~1-7 dní):
- Zkontrolují code quality
- Otestují deployment
- Dají feedback
- Schválí nebo požádají o změny

## Po schválení

Unifarr se objeví v:
- TrueNAS SCALE Apps UI
- TrueCharts katalog
- Auto-update support

Uživatelé jen:
1. Přidají TrueCharts katalog (většina už má)
2. Instalují Unifarr z Apps UI
3. Profit! 🎉

## Alternativa: Vlastní katalog (rychlejší)

Pokud nechceš čekat na TrueCharts approval:

```bash
# Publikuj vlastní katalog
# Users přidají:
Repository: https://github.com/mrpajzl/Unifarr
Branch: gh-pages
Train: charts
```

To už máme hotové! ✅

## Shrnutí

**Doporučený postup:**
1. ✅ **Vlastní katalog** (funguje už TEĎ) - pro early adopters
2. 🔄 **TrueCharts PR** (1-2 týdny) - pro širokou veřejnost
3. 📅 **iX Official** (měsíce) - pro maximální dosah

Chceš to rovnou submitnout do TrueCharts nebo zatím držet jako vlastní katalog?
