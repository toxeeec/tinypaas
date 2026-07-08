{
  inputs = {
    git-hooks.url = "github:cachix/git-hooks.nix";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };
  outputs = {
    self,
    git-hooks,
    nixpkgs,
    ...
  }: let
    forAllSystems = function:
      nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
        system: function system nixpkgs.legacyPackages.${system}
      );
  in {
    formatter = forAllSystems (_system: pkgs: pkgs.alejandra);

    checks = forAllSystems (system: pkgs: {
      pre-commit-check = git-hooks.lib.${system}.run {
        src = ./.;
        package = pkgs.prek;

        hooks = {
          alejandra.enable = true;
          statix.enable = true;
        };
      };
    });

    devShells = forAllSystems (system: pkgs: {
      default = let
        inherit (self.checks.${system}.pre-commit-check) shellHook enabledPackages;
      in
        pkgs.mkShell {
          inherit shellHook;
          packages = enabledPackages;
        };
    });
  };
}
