{
  inputs = {
    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nub = {
      url = "github:nubjs/nub";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs = inputs @ {
    git-hooks,
    nixpkgs,
    ...
  }: let
    systems = ["aarch64-darwin" "aarch64-linux" "x86_64-linux"];
    forAllSystems = function:
      nixpkgs.lib.genAttrs systems (
        system: function system nixpkgs.legacyPackages.${system}
      );
    mkGitHooks = system: pkgs: hooks:
      git-hooks.lib.${system}.run {
        src = ./.;
        package = pkgs.prek;
        excludes = ["^repos/"];
        inherit hooks;
      };
    hooks = pkgs: {
      alejandra = {
        enable = true;
        priority = 0;
        settings.verbosity = "quiet";
      };
      check-merge-conflicts = {
        enable = true;
        priority = 1;
      };
      deadnix = {
        enable = true;
        priority = 1;
      };
      flake-checker = {
        enable = true;
        priority = 1;
      };
      ripsecrets = {
        enable = true;
        priority = 1;
      };
      shellcheck = {
        enable = true;
        priority = 1;
      };
      shfmt = {
        enable = true;
        priority = 0;
      };
      vendored-versions = {
        always_run = true;
        enable = true;
        entry = "${pkgs.bash}/bin/bash nix/check-vendored-versions.sh";
        extraPackages = [pkgs.findutils pkgs.jq pkgs.yq-go];
        pass_filenames = false;
        priority = 1;
      };
      statix = {
        enable = true;
        priority = 1;
      };
    };
  in {
    checks = forAllSystems (system: pkgs: let
      inherit (inputs.nub.packages.${system}) nub;
      inherit (import ./nix/nub.nix {inherit pkgs;}) fetchNubDeps nubConfigHook;
      nubDeps = fetchNubDeps {
        pname = "tinypaas";
        src = pkgs.lib.fileset.toSource {
          root = ./.;
          fileset = pkgs.lib.fileset.unions [
            ./package.json
            ./nub.lock
            ./.npmrc

            (pkgs.lib.fileset.fileFilter (
                file: file.name == "package.json"
              )
              ./packages)
          ];
        };
        inherit nub;
        hash = "sha256-weG6iTKUEuyIQnFJT3gOB20w5O/m6j7xgm0jvWJ9p2Y=";
      };
    in {
      git-hooks = mkGitHooks system pkgs (hooks pkgs);
      project-checks = pkgs.stdenvNoCC.mkDerivation {
        name = "project-checks";
        src = ./.;
        inherit nubDeps;
        strictDeps = true;
        nativeBuildInputs = [pkgs.nodejs_26 nub nubConfigHook];
        buildPhase = ''
          runHook preBuild
          nub run check
          runHook postBuild
        '';
        installPhase = "touch $out";
      };
    });

    devShells = forAllSystems (system: pkgs: let
      inherit (inputs.nub.packages.${system}) nub;
      gitHooks = mkGitHooks system pkgs (
        (hooks pkgs)
        // {
          flake-eval = {
            enable = true;
            entry = "${pkgs.nix}/bin/nix flake check --no-build --all-systems";
            files = "^(flake\\.(nix|lock)|nix/)";
            pass_filenames = false;
            priority = 1;
          };
          project-checks = {
            always_run = true;
            enable = true;
            entry = "nub run check";
            extraPackages = [nub];
            pass_filenames = false;
            priority = 0;
          };
        }
      );
    in {
      default = pkgs.mkShell {
        inherit (gitHooks) shellHook;
        packages =
          gitHooks.enabledPackages
          ++ [
            nub
            pkgs.nodejs_26
          ];
      };
    });
  };
}
