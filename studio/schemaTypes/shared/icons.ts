// One source of truth: the icon set of the site's design-system port.
import { iconNames } from "../../../src/components/ds/Icon/icons";

export const iconOptions = iconNames.map((name) => ({ title: name, value: name }));
