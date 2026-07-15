# shellcheck shell=bash

set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

for repository in repos/*; do
	[[ -d $repository ]] || continue

	package="${repository##*/}"
	lock_version="$(PACKAGE="$package" yq -er '.catalogs.default[strenv(PACKAGE)].version' nub.lock)"
	vendored_output="$(
		find "$repository" -type f -name package.json \
			-exec jq -r --arg package "$package" \
			'select(.name == $package) | .version' {} +
	)"
	vendored_versions=()
	if [[ -n $vendored_output ]]; then
		mapfile -t vendored_versions <<<"$vendored_output"
	fi

	if [[ ${#vendored_versions[@]} -ne 1 ]]; then
		echo "$repository must contain exactly one package.json named $package" >&2
		exit 1
	fi

	if [[ ${vendored_versions[0]} != "$lock_version" ]]; then
		echo "$package version mismatch: nub.lock has $lock_version, $repository has ${vendored_versions[0]}" >&2
		exit 1
	fi
done
